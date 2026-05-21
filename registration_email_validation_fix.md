# Duplicate Email Registration Validation Walkthrough

We have implemented a validation fix for both candidate and recruiter registration flows when a user attempts to re-register with an already registered email. 

## Features Implemented
1. **Dynamic Backend Error Parsing**: The registration submission catch block now inspects the API error response payload. If it detects a duplicate email error (either through the `email` key in serializer errors or matching strings), it flags it specifically as an email registration error.
2. **Inline Error Display**: It assigns the exact error message `"Email is already registered"` to the `regErrors.email` state value, displaying the message directly under the email field on the form.
3. **Smooth Navigation & Focus**: It utilizes a `setTimeout` window after the React render cycle to find the email input element (`id="reg-email"`), smooth-scroll it into view, and automatically focus it for immediate user re-entry.
4. **Instant Validation Clearing**: The components' existing `updateReg` method handles clearing the field-specific error dynamically once the user starts typing in the email field again.

---

## Code Diffs

### 1. Candidate Portal (`src/pages/CandidateLogin.tsx`)

We updated the registration catch handler block to parse the API response, set the state, scroll, and focus on the email input:

```diff
     } catch (err: any) {
       let msg = "Something went wrong";
       const error = err.response?.data;
-      if (typeof error === "string") {
-        msg = error;
-      } else if (error) {
-        const firstKey = Object.keys(error)[0];
-        if (firstKey) {
-          const firstErr = error[firstKey];
-          msg = Array.isArray(firstErr) ? `${firstKey}: ${firstErr[0]}` : String(firstErr);
+      
+      let isEmailError = false;
+      if (error && typeof error === "object") {
+        if (error.email) {
+          isEmailError = true;
+        } else {
+          for (const key of Object.keys(error)) {
+            if (key.toLowerCase().includes("email")) {
+              isEmailError = true;
+              break;
+            }
+          }
+        }
+      } else if (typeof error === "string" && (error.toLowerCase().includes("email already registered") || error.toLowerCase().includes("email is already registered"))) {
+        isEmailError = true;
+      }
+
+      if (isEmailError) {
+        setRegErrors(prev => ({
+          ...prev,
+          email: "Email is already registered",
+        }));
+        
+        setTimeout(() => {
+          const element = document.getElementById("reg-email");
+          if (element) {
+            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
+            (element as HTMLElement).focus();
+          }
+        }, 100);
+        
+        msg = "Email is already registered";
+      } else {
+        if (typeof error === "string") {
+          msg = error;
+        } else if (error) {
+          const firstKey = Object.keys(error)[0];
+          if (firstKey) {
+            const firstErr = error[firstKey];
+            msg = Array.isArray(firstErr) ? `${firstKey}: ${firstErr[0]}` : String(firstErr);
+          }
         }
       }
       toast({ title: "Registration failed", description: msg, variant: "destructive" });
```

---

### 2. Recruiter Portal (`src/pages/RecruiterLogin.tsx`)

We applied the exact same robust parsing and validation update to the recruiter registration workflow:

```diff
     } catch (err: any) {
       let msg = "Something went wrong";
       const error = err.response?.data;
-      if (typeof error === "string") {
-        msg = error;
-      } else if (error) {
-        const firstKey = Object.keys(error)[0];
-        if (firstKey) {
-          const firstErr = error[firstKey];
-          msg = Array.isArray(firstErr) ? `${firstKey}: ${firstErr[0]}` : String(firstErr);
+      
+      let isEmailError = false;
+      if (error && typeof error === "object") {
+        if (error.email) {
+          isEmailError = true;
+        } else {
+          for (const key of Object.keys(error)) {
+            if (key.toLowerCase().includes("email")) {
+              isEmailError = true;
+              break;
+            }
+          }
+        }
+      } else if (typeof error === "string" && (error.toLowerCase().includes("email already registered") || error.toLowerCase().includes("email is already registered"))) {
+        isEmailError = true;
+      }
+
+      if (isEmailError) {
+        setRegErrors(prev => ({
+          ...prev,
+          email: "Email is already registered",
+        }));
+        
+        setTimeout(() => {
+          const element = document.getElementById("reg-email");
+          if (element) {
+            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
+            (element as HTMLElement).focus();
+          }
+        }, 100);
+        
+        msg = "Email is already registered";
+      } else {
+        if (typeof error === "string") {
+          msg = error;
+        } else if (error) {
+          const firstKey = Object.keys(error)[0];
+          if (firstKey) {
+            const firstErr = error[firstKey];
+            msg = Array.isArray(firstErr) ? `${firstKey}: ${firstErr[0]}` : String(firstErr);
+          }
         }
       }
       toast({ title: "Registration failed", description: msg, variant: "destructive" });
```
