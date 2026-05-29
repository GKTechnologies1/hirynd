from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from unittest.mock import patch
from candidates.models import Candidate
from billing.models import SubscriptionPlan, SubscriptionAddon, Subscription, SubscriptionAddonAssignment, Payment, RazorpayOrder, Invoice, PurchaseHistory
from billing.serializers import PaymentSerializer, InvoiceSerializer, PurchaseHistorySerializer
from billing.utils import generate_invoice_pdf
from billing.services import SubscriptionService, AddonService, PaymentService, SubscriptionLifecycleManager

User = get_user_model()

class BillingDecoupledTests(TestCase):
    def setUp(self):
        # Create users
        self.admin = User.objects.create_superuser(email='admin@hyrind.com', password='password')
        self.candidate_user = User.objects.create_user(email='candidate@gmail.com', password='password', role='candidate')
        self.candidate = Candidate.objects.create(user=self.candidate_user, status='approved')

        # Create plans and addons
        self.base_plan = SubscriptionPlan.objects.create(
            name='Monthly Service Fee',
            description='Standard monthly service fee',
            amount=Decimal('400.00'),
            currency='USD',
            billing_cycle='monthly',
            is_active=True,
            is_base=True,
            created_by=self.admin
        )

        self.mock_addon = SubscriptionAddon.objects.create(
            name='Mock Practice Fee',
            description='Mock practice addon',
            amount=Decimal('150.00'),
            currency='USD',
            is_active=True,
            created_by=self.admin
        )

    @patch('billing.services.send_email')
    @patch('billing.services.create_notification')
    def test_assign_base_subscription_strictly(self, mock_create_notification, mock_send_email):
        """Test that assigning a base subscription plan strictly sets up base subscription details and pending payments."""
        sub = SubscriptionService.assign_subscription(
            candidate=self.candidate,
            plan=self.base_plan,
            custom_amount=Decimal('350.00'),
            billing_cycle='monthly',
            admin_notes='Special discount applied',
            assigned_by=self.admin
        )

        self.assertEqual(sub.plan, self.base_plan)
        self.assertEqual(sub.amount, Decimal('350.00'))
        self.assertEqual(sub.status, 'pending_payment')
        self.assertIsNone(sub.start_date)

        # Check that a pending payment was generated
        payments = Payment.objects.filter(candidate=self.candidate, payment_type='monthly_service')
        self.assertEqual(payments.count(), 1)
        self.assertEqual(payments.first().amount, Decimal('350.00'))
        self.assertEqual(payments.first().status, 'pending')

        # Check notifications were generated
        mock_create_notification.assert_called()
        mock_send_email.assert_called()

    @patch('billing.services.send_email')
    @patch('billing.services.create_notification')
    @patch('billing.services.AddonService.generate_invoice_for_addon')
    def test_assign_addon_standalone_pending(self, mock_generate_invoice, mock_create_notification, mock_send_email):
        """Test assigning an addon to a candidate standalone without an active base subscription in pending state."""
        assignment = AddonService.assign_addon(
            candidate=self.candidate,
            addon=self.mock_addon,
            custom_amount=Decimal('120.00'),
            admin_notes='Decoupled addon notes',
            added_by=self.admin,
            activate_immediately=False
        )

        self.assertEqual(assignment.candidate, self.candidate)
        self.assertIsNone(assignment.subscription)
        self.assertEqual(assignment.addon, self.mock_addon)
        self.assertEqual(assignment.amount, Decimal('120.00'))
        self.assertEqual(assignment.status, 'pending')

        # Check related payment created
        pay = Payment.objects.filter(candidate=self.candidate, payment_type='addon')
        self.assertEqual(pay.count(), 1)
        self.assertEqual(pay.first().status, 'pending')
        self.assertEqual(pay.first().addon_assignment, assignment)

        # Check no invoice was generated since it's pending payment
        mock_generate_invoice.assert_not_called()
        mock_create_notification.assert_called()

    @patch('billing.services.send_email')
    @patch('billing.services.create_notification')
    @patch('billing.services.AddonService.generate_invoice_for_addon')
    def test_assign_addon_activate_immediately(self, mock_generate_invoice, mock_create_notification, mock_send_email):
        """Test assigning an addon with activate_immediately=True completes assignment immediately and fires fulfillment."""
        assignment = AddonService.assign_addon(
            candidate=self.candidate,
            addon=self.mock_addon,
            custom_amount=Decimal('150.00'),
            admin_notes='Immediate activation',
            added_by=self.admin,
            activate_immediately=True
        )

        self.assertEqual(assignment.status, 'completed')

        # Check related payment is also completed
        pay = Payment.objects.filter(candidate=self.candidate, payment_type='addon')
        self.assertEqual(pay.count(), 1)
        self.assertEqual(pay.first().status, 'completed')

        # Verification of invoice generation trigger
        mock_generate_invoice.assert_called_once()

    @patch('billing.views._get_razorpay_client')
    @patch('billing.services.AddonService.generate_invoice_for_addon')
    def test_verify_individual_payment_addon_success(self, mock_generate_invoice, mock_get_razorpay):
        """Test that verifying an individual addon payment transitions the assignment to completed."""
        # 1. Create a pending addon assignment
        assignment = AddonService.assign_addon(
            candidate=self.candidate,
            addon=self.mock_addon,
            custom_amount=Decimal('150.00'),
            added_by=self.admin,
            activate_immediately=False
        )

        pay = Payment.objects.get(addon_assignment=assignment)

        # 2. Setup mock RazorpayOrder
        rp_order = RazorpayOrder.objects.create(
            candidate=self.candidate,
            razorpay_order_id='rz_order_123',
            amount=150.00,
            currency='USD',
            payment_type='addon',
            notes={'billing_payment_id': str(pay.id)}
        )

        # Mock razorpay client verification utility
        from unittest.mock import MagicMock
        mock_client = MagicMock()
        mock_get_razorpay.return_value = (mock_client, 'key_123')

        # 3. Verify the payment
        completed_payment = PaymentService.verify_individual_payment(
            candidate_id=self.candidate.id,
            payment_id=pay.id,
            razorpay_order_id='rz_order_123',
            razorpay_payment_id='pay_payment_789',
            razorpay_signature='signature_abc'
        )

        # Check payment completed
        self.assertEqual(completed_payment.status, 'completed')
        self.assertEqual(completed_payment.razorpay_order.razorpay_payment_id, 'pay_payment_789')

        # Check assignment also transitioned to completed
        assignment.refresh_from_db()
        self.assertEqual(assignment.status, 'completed')

        # Check invoice generation triggered
        mock_generate_invoice.assert_called_once()

    @patch('billing.services.send_email')
    @patch('billing.services.create_notification')
    def test_subscription_lifecycle_manager_transitions(self, mock_create_notification, mock_send_email):
        """Test that active subscription transitions to pending_payment on expiry and updates candidate status."""
        # Create active subscription with expiry in the past
        past_date = timezone.now().date() - timezone.timedelta(days=1)
        sub = Subscription.objects.create(
            candidate=self.candidate,
            plan=self.base_plan,
            plan_name=self.base_plan.name,
            amount=Decimal('400.00'),
            currency='USD',
            billing_cycle='monthly',
            status='active',
            next_billing_at=past_date
        )

        # Candidate is currently active marketing
        self.candidate.status = 'active_marketing'
        self.candidate.save()

        # Run check
        SubscriptionLifecycleManager.check_and_update_all_subscriptions()

        # Verify subscription transitioned
        sub.refresh_from_db()
        self.assertEqual(sub.status, 'pending_payment')

        # Verify candidate transitioned to past_due
        self.candidate.refresh_from_db()
        self.assertEqual(self.candidate.status, 'past_due')

        # Verify email and notification were triggered
        mock_send_email.assert_called()
        mock_create_notification.assert_called()

    @patch('billing.views._get_razorpay_client')
    @patch('billing.services.send_email')
    def test_addon_payment_creates_purchase_history(self, mock_send_email, mock_get_razorpay):
        """Test that successfully completing an addon payment automatically generates a PurchaseHistory record."""
        # 1. Assign pending addon
        assignment = AddonService.assign_addon(
            candidate=self.candidate,
            addon=self.mock_addon,
            custom_amount=Decimal('150.00'),
            added_by=self.admin,
            activate_immediately=False
        )
        pay = Payment.objects.get(addon_assignment=assignment)

        # Create mock Razorpay order
        rp_order = RazorpayOrder.objects.create(
            candidate=self.candidate,
            razorpay_order_id='rz_addon_order_123',
            amount=150.00,
            currency='USD',
            payment_type='addon',
            notes={'billing_payment_id': str(pay.id)}
        )

        from unittest.mock import MagicMock
        mock_client = MagicMock()
        mock_get_razorpay.return_value = (mock_client, 'key_123')

        # 2. Verify payment
        PaymentService.verify_individual_payment(
            candidate_id=self.candidate.id,
            payment_id=pay.id,
            razorpay_order_id='rz_addon_order_123',
            razorpay_payment_id='pay_addon_payment_456',
            razorpay_signature='signature_123'
        )

        # 3. Verify PurchaseHistory was recorded
        from billing.models import PurchaseHistory
        purchases = PurchaseHistory.objects.filter(candidate=self.candidate, addon_assignment=assignment)
        self.assertEqual(purchases.count(), 1)
        purchase = purchases.first()
        self.assertEqual(purchase.service_name, 'Mock Practice Fee')
        self.assertEqual(purchase.amount, Decimal('150.00'))
        self.assertEqual(purchase.purchased_by, 'Candidate')
        self.assertEqual(purchase.transaction_id, 'pay_addon_payment_456')

    @patch('billing.services.send_email')
    def test_addon_immediate_activation_creates_purchase_history(self, mock_send_email):
        """Test that immediately activating a complimentary addon generates a PurchaseHistory record marked as purchased by Admin."""
        assignment = AddonService.assign_addon(
            candidate=self.candidate,
            addon=self.mock_addon,
            custom_amount=Decimal('0.00'),
            admin_notes='Complimentary mock practice',
            added_by=self.admin,
            activate_immediately=True
        )

        # Verify PurchaseHistory recorded as complimentary
        from billing.models import PurchaseHistory
        purchases = PurchaseHistory.objects.filter(candidate=self.candidate, addon_assignment=assignment)
        self.assertEqual(purchases.count(), 1)
        purchase = purchases.first()
        self.assertEqual(purchase.amount, Decimal('0.00'))
        self.assertEqual(purchase.purchased_by, f"Admin ({self.admin.email})")

    def test_invoice_contains_tax_details(self):
        """Test that generated Invoice objects contain the new tax_amount and tax_rate fields."""
        invoice = Invoice.objects.create(
            candidate=self.candidate,
            amount=Decimal('400.00'),
            currency='USD',
            period_start=timezone.now().date(),
            period_end=timezone.now().date() + timezone.timedelta(days=30),
            status='paid',
            tax_amount=Decimal('18.00'),
            tax_rate=Decimal('4.50')
        )

        self.assertEqual(invoice.tax_amount, Decimal('18.00'))
        self.assertEqual(invoice.tax_rate, Decimal('4.50'))

    def test_payment_serializer_sanitizes_razorpay_notes(self):
        """Test that PaymentSerializer removes any auto-generated Razorpay payment ID strings from notes."""
        payment = Payment.objects.create(
            candidate=self.candidate,
            amount=Decimal('400.00'),
            currency='USD',
            payment_type='monthly_service',
            status='completed',
            notes="Add-on Fee: work support | Razorpay: pay_Sv1Ta4P6sPfata"
        )
        data = PaymentSerializer(payment).data
        self.assertNotIn("pay_Sv1Ta4P6sPfata", data['notes'])
        self.assertNotIn("Razorpay", data['notes'])
        self.assertEqual(data['notes'], "Add-on Fee: work support")

    def test_invoice_serializer_masks_payment_reference(self):
        """Test that InvoiceSerializer masks Razorpay payment references with friendly TXN reference."""
        invoice = Invoice.objects.create(
            candidate=self.candidate,
            amount=Decimal('400.00'),
            currency='USD',
            period_start=timezone.now().date(),
            period_end=timezone.now().date() + timezone.timedelta(days=30),
            status='paid',
            payment_reference="pay_Sv1Ta4P6sPfata",
            description="Add-on Fee: work support | Razorpay: pay_Sv1Ta4P6sPfata"
        )
        data = InvoiceSerializer(invoice).data
        self.assertNotIn("pay_Sv1Ta4P6sPfata", data['payment_reference'])
        self.assertTrue(data['payment_reference'].startswith("TXN-"))
        self.assertNotIn("pay_Sv1Ta4P6sPfata", data['description'])
        self.assertEqual(data['description'], "Add-on Fee: work support")

    def test_purchase_history_serializer_masks_gateway_ids(self):
        """Test that PurchaseHistorySerializer hides gateway IDs and returns user-friendly TXN references."""
        ph = PurchaseHistory.objects.create(
            candidate=self.candidate,
            service_name="Add-on Fee: work support | Razorpay: pay_Sv1Ta4P6sPfata",
            amount=Decimal('400.00'),
            currency='USD',
            transaction_id="pay_Sv1Ta4P6sPfata",
            invoice_reference="pay_Sv1Ta4P6sPfata"
        )
        data = PurchaseHistorySerializer(ph).data
        self.assertNotIn("pay_Sv1Ta4P6sPfata", data['service_name'])
        self.assertEqual(data['service_name'], "Add-on Fee: work support")
        self.assertTrue(data['transaction_id'].startswith("TXN-"))
        self.assertTrue(data['invoice_reference'].startswith("TXN-"))

    def test_generate_invoice_pdf_sanitizes_description(self):
        """Test that generate_invoice_pdf removes Razorpay IDs from invoice description in generated PDF."""
        invoice = Invoice.objects.create(
            candidate=self.candidate,
            amount=Decimal('400.00'),
            currency='USD',
            period_start=timezone.now().date(),
            period_end=timezone.now().date() + timezone.timedelta(days=30),
            status='paid',
            description="Add-on Fee: work support | Razorpay: pay_Sv1Ta4P6sPfata"
        )
        pdf_bytes = generate_invoice_pdf(invoice)
        self.assertNotIn(b"pay_Sv1Ta4P6sPfata", pdf_bytes)
        self.assertNotIn(b"Razorpay:", pdf_bytes)

    def test_audit_log_serializer_masks_details_for_non_admin(self):
        """Test that AuditLogSerializer masks Razorpay IDs in JSON details field for non-admin requests."""
        from audit.models import AuditLog
        from audit.serializers import AuditLogSerializer
        
        log = AuditLog.objects.create(
            actor=self.candidate_user,
            action="payment_completed",
            target_id=str(self.candidate.id),
            target_type="candidate",
            details={'payment_id': "pay_Sv1Ta4P6sPfata", 'gateway': "razorpay"}
        )
        
        # Test non-admin request
        from unittest.mock import MagicMock
        request = MagicMock()
        request.user = self.candidate_user
        
        serializer = AuditLogSerializer(log, context={'request': request})
        data = serializer.data
        self.assertEqual(data['details']['payment_id'], "TXN-HIDDEN")
        
        # Test admin request
        request.user = self.admin
        serializer_admin = AuditLogSerializer(log, context={'request': request})
        data_admin = serializer_admin.data
        self.assertEqual(data_admin['details']['payment_id'], "pay_Sv1Ta4P6sPfata")

