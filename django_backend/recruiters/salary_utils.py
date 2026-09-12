import re


def parse_job_salary(salary_str):
    """
    Parses a raw job salary string and returns (min_val, max_val) in annual USD terms,
    or None if the salary is not disclosed or cannot be parsed.
    """
    if not salary_str:
        return None
    s = str(salary_str).strip().lower()
    if not s or s in ('-', 'not disclosed', 'none', 'null', 'undefined', 'n/a'):
        return None

    # Check for hourly rate e.g. '$60/hr', '$50 / hour'
    is_hourly = any(x in s for x in ('/hr', '/hour', 'per hour', 'hourly'))

    # Extract numbers with optional 'k'
    tokens = re.findall(r'(\d+(?:[\d,]*\d)?(?:\.\d+)?)\s*(k\b)?', s)
    nums = []
    for num_str, k in tokens:
        clean_num = num_str.replace(',', '')
        try:
            val = float(clean_num)
            if k:
                val *= 1000
            elif is_hourly and val < 1000:
                val *= 2080  # standard 2080 working hours per year
            nums.append(val)
        except ValueError:
            pass

    if not nums:
        return None
    return min(nums), max(nums)


def parse_salary_filter_criteria(filter_str):
    """
    Parses comma, pipe, or semicolon separated salary filter options.
    Returns a list of matcher functions: lambda (j_min, j_max) -> bool.
    """
    if not filter_str:
        return []

    # Strip thousand-separator commas (e.g. "$150,000" -> "$150000") so it doesn't split on comma
    normalized = re.sub(r'(?<=\d),(?=\d{3}\b)', '', str(filter_str))
    items = [p.strip() for p in re.split(r'[,|;]', normalized) if p.strip()]
    criteria = []

    for raw_item in items:
        # Normalize: replace encoded or literal '+'
        item = raw_item.lower().replace('%2b', '+').strip()

        if item in ('disclosed only', 'disclosed', 'disclosed_only', 'disclosed-only'):
            # Any disclosed salary matches
            criteria.append(lambda j_min, j_max: True)
            continue

        # Check for range: e.g. '50000 - 100000', '$50k - $100k'
        range_match = re.search(r'(\d+(?:[\d,]*\d)?(?:\.\d+)?)\s*(k)?\s*[-–—to]+\s*(\d+(?:[\d,]*\d)?(?:\.\d+)?)\s*(k)?', item)
        if range_match:
            n1, k1, n2, k2 = range_match.groups()
            v1 = float(n1.replace(',', '')) * (1000 if k1 else 1)
            v2 = float(n2.replace(',', '')) * (1000 if k2 else 1)
            lower, upper = min(v1, v2), max(v1, v2)
            criteria.append(lambda j_min, j_max, lo=lower, hi=upper: (j_max >= lo and j_min <= hi))
            continue

        # Check for threshold '+', e.g. '$50,000+', '$100,000+', '100k+'
        if '+' in item or 'above' in item or 'over' in item or '>=' in item or '>' in item:
            num_match = re.search(r'(\d+(?:[\d,]*\d)?(?:\.\d+)?)\s*(k)?', item)
            if num_match:
                n, k = num_match.groups()
                threshold = float(n.replace(',', '')) * (1000 if k else 1)
                criteria.append(lambda j_min, j_max, th=threshold: j_max >= th)
                continue

        # Check for 'under', '<', '<='
        if 'under' in item or '<' in item or 'below' in item or 'less' in item:
            num_match = re.search(r'(\d+(?:[\d,]*\d)?(?:\.\d+)?)\s*(k)?', item)
            if num_match:
                n, k = num_match.groups()
                threshold = float(n.replace(',', '')) * (1000 if k else 1)
                criteria.append(lambda j_min, j_max, th=threshold: j_min <= th)
                continue

        # Standalone number: e.g. '100000' -> treat as >= 100000
        num_match = re.search(r'(\d+(?:[\d,]*\d)?(?:\.\d+)?)\s*(k)?', item)
        if num_match:
            n, k = num_match.groups()
            threshold = float(n.replace(',', '')) * (1000 if k else 1)
            criteria.append(lambda j_min, j_max, th=threshold: j_max >= th)

    return criteria


def job_matches_salary(salary_raw, filter_str):
    """
    Checks if a job's raw salary string matches the filter criteria.
    If multiple criteria are specified, returns True if ANY criterion matches (OR logic).
    """
    criteria = parse_salary_filter_criteria(filter_str)
    if not criteria:
        return True

    sal_range = parse_job_salary(salary_raw)
    if sal_range is None:
        return False

    j_min, j_max = sal_range
    return any(c(j_min, j_max) for c in criteria)


def filter_jobs_by_salary(queryset, salary_filter_str):
    """
    Filters a JobLinkEntry queryset by salary criteria.
    Returns the filtered queryset preserving it as a QuerySet.
    """
    if not salary_filter_str or not str(salary_filter_str).strip():
        return queryset

    criteria = parse_salary_filter_criteria(salary_filter_str)
    if not criteria:
        return queryset

    matching_ids = []
    for job_id, salary_raw in queryset.values_list('id', 'salary'):
        sal_range = parse_job_salary(salary_raw)
        if sal_range is not None:
            j_min, j_max = sal_range
            if any(c(j_min, j_max) for c in criteria):
                matching_ids.append(job_id)

    return queryset.filter(id__in=matching_ids)
