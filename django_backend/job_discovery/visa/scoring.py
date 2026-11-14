"""
Turns a company's visa data into a 0-100 score and an A-F grade.
Reused directly from existing Hyrind scoring formula.
"""
from datetime import datetime


def compute_visa_score(
    h1b_filings: int = 0,
    approvals: int = 0,
    denials: int = 0,
    perm_filings: int = 0,
    everify: bool = False,
    year: int = 0,
) -> dict:
    score = 0

    # 1. Filing volume (max of LCA filings and total USCIS decisions)
    h1b_filings = int(h1b_filings or 0)
    approvals = int(approvals or 0)
    denials = int(denials or 0)
    total_decisions = approvals + denials
    filings = max(h1b_filings, total_decisions)

    if filings >= 100:
        vol_pts = 40
    elif filings >= 25:
        vol_pts = 30
    elif filings >= 5:
        vol_pts = 20
    elif filings >= 1:
        vol_pts = 10
    else:
        vol_pts = 0
    score += vol_pts

    # 2. Approval rate (up to 25 points)
    rate_pts = 0
    rate_pct = None
    if total_decisions > 0:
        rate = approvals / total_decisions
        rate_pts = round(rate * 25)
        rate_pct = round(rate * 100, 2)
        score += rate_pts

    # 3. Recency (up to 15 points)
    yr = int(year or 0)
    current_year = datetime.now().year
    recency_pts = 0
    if yr >= current_year - 1:
        recency_pts = 15
    elif yr >= current_year - 3:
        recency_pts = 8
    score += recency_pts

    # 4. Green card sponsorship (PERM) (10 points)
    perm_filings = int(perm_filings or 0)
    perm_pts = 10 if perm_filings > 0 else 0
    score += perm_pts

    # 5. E-Verify enrollment (10 points)
    everify_pts = 10 if everify else 0
    score += everify_pts

    score = min(score, 100)

    # Grade mapping
    if score >= 85:
        grade = 'A'
    elif score >= 70:
        grade = 'B'
    elif score >= 50:
        grade = 'C'
    elif score >= 30:
        grade = 'D'
    elif score >= 15:
        grade = 'E'
    else:
        grade = 'F'

    return {
        'score': score,
        'grade': grade,
        'approval_rate': rate_pct,
        'factors': {
            'filing_volume_points': vol_pts,
            'approval_rate_points': rate_pts,
            'recency_points': recency_pts,
            'perm_points': perm_pts,
            'everify_points': everify_pts,
            'total_filings': filings,
            'approvals': approvals,
            'denials': denials,
            'perm_filings': perm_filings,
            'last_year': yr,
            'everify': bool(everify),
        }
    }

