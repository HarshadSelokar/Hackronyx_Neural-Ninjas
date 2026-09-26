import uuid
import json
from datetime import datetime, date, timedelta
from app.database import get_db
from app.auth import hash_password
import logging

logger = logging.getLogger(__name__)

def run_seed():
    with get_db() as cur:
        # 1. Departments
        cur.execute("SELECT count(*) as cnt FROM public.departments;")
        if cur.fetchone()["cnt"] == 0:
            logger.info("Seeding departments...")
            departments = [
                ('Engineering', 'Software engineering, DevOps, and cloud systems'),
                ('Marketing', 'Growth, brand marketing, and public relations'),
                ('Sales', 'Direct sales, enterprise accounts, and business development'),
                ('Finance', 'Financial planning, accounting, and payroll'),
                ('HR', 'People operations, recruiting, and culture'),
                ('Operations', 'Business operations, facilities, and administration')
            ]
            for name, desc in departments:
                cur.execute(
                    "INSERT INTO public.departments (id, name, description) VALUES (%s, %s, %s);",
                    (str(uuid.uuid4()), name, desc)
                )

        # Get department map
        cur.execute("SELECT id, name FROM public.departments;")
        dept_map = {row["name"]: str(row["id"]) for row in cur.fetchall()}

        # 2. Expense Policies
        cur.execute("SELECT count(*) as cnt FROM public.expense_policies;")
        if cur.fetchone()["cnt"] == 0:
            logger.info("Seeding expense policies...")
            policies = [
                ('Travel', 50000.0, None, True, 'Airfare, trains, and intercity travel expenses'),
                ('Accommodation', 8000.0, None, True, 'Hotel accommodation limit per transaction'),
                ('Food', 1500.0, 1500.0, True, 'Client dinners and daily meal allowances'),
                ('Office Supplies', 10000.0, None, True, 'Hardware peripherals and stationery'),
                ('Cloud Infrastructure', 100000.0, None, True, 'AWS, GCP, Supabase, and SaaS hosting subscriptions')
            ]
            for cat, max_t, max_d, req_rec, desc in policies:
                cur.execute("""
                    INSERT INTO public.expense_policies 
                    (id, category, max_amount_per_transaction, max_amount_per_day, receipt_required, description, is_active)
                    VALUES (%s, %s, %s, %s, %s, %s, true);
                """, (str(uuid.uuid4()), cat, max_t, max_d, req_rec, desc))

        # 3. Approval Rules
        cur.execute("SELECT count(*) as cnt FROM public.approval_rules;")
        if cur.fetchone()["cnt"] == 0:
            logger.info("Seeding approval rules...")
            rules = [
                (0.0, 5000.0, 'manager', 1),
                (5000.01, 25000.0, 'manager', 1),
                (5000.01, 25000.0, 'finance', 2),
                (25000.01, None, 'manager', 1),
                (25000.01, None, 'finance', 2),
                (25000.01, None, 'admin', 3)
            ]
            for min_a, max_a, req_role, app_order in rules:
                cur.execute("""
                    INSERT INTO public.approval_rules 
                    (id, min_amount, max_amount, required_role, approval_order, is_active)
                    VALUES (%s, %s, %s, %s, %s, true);
                """, (str(uuid.uuid4()), min_a, max_a, req_role, app_order))

        # 4. Demo Users in auth.users and public.profiles
        demo_users = [
            ("employee@company.com", "employee123", "Rahul Sharma", "EMP-101", "employee", dept_map.get("Engineering")),
            ("manager@company.com", "manager123", "Priya Nair", "MGR-201", "manager", dept_map.get("Engineering")),
            ("finance@company.com", "finance123", "Amit Verma", "FIN-301", "finance", dept_map.get("Finance")),
            ("admin@company.com", "admin123", "Sneha Patel", "ADM-401", "admin", dept_map.get("Operations"))
        ]

        user_id_map = {}
        for email, pwd, full_name, code, role, dept_id in demo_users:
            cur.execute("SELECT id FROM auth.users WHERE email = %s;", (email,))
            existing_user = cur.fetchone()
            if not existing_user:
                uid = str(uuid.uuid4())
                hashed_pwd = hash_password(pwd)
                cur.execute("""
                    INSERT INTO auth.users (
                        id, instance_id, aud, role, email, encrypted_password, 
                        email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
                    ) VALUES (
                        %s, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
                        %s, %s, NOW(), '{"provider":"email","providers":["email"]}', 
                        jsonb_build_object('full_name', %s), NOW(), NOW()
                    );
                """, (uid, email, hashed_pwd, full_name))

                cur.execute("""
                    INSERT INTO public.profiles (
                        id, full_name, employee_code, role, department_id, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
                    ON CONFLICT (id) DO UPDATE SET 
                        role = EXCLUDED.role, department_id = EXCLUDED.department_id;
                """, (uid, full_name, code, role, dept_id))
                user_id_map[role] = uid
            else:
                uid = str(existing_user["id"])
                user_id_map[role] = uid
                cur.execute("""
                    INSERT INTO public.profiles (id, full_name, employee_code, role, department_id, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
                    ON CONFLICT (id) DO UPDATE SET 
                        role = EXCLUDED.role, department_id = EXCLUDED.department_id;
                """, (uid, full_name, code, role, dept_id))

        # 5. Budgets
        cur.execute("SELECT count(*) as cnt FROM public.budgets;")
        if cur.fetchone()["cnt"] == 0:
            logger.info("Seeding department budgets...")
            admin_id = user_id_map.get("admin")
            budgets = [
                (dept_map.get("Engineering"), 2026, 5000000.0), # 50L
                (dept_map.get("Marketing"), 2026, 2500000.0),   # 25L
                (dept_map.get("Sales"), 2026, 3500000.0),       # 35L
                (dept_map.get("Finance"), 2026, 1500000.0),     # 15L
                (dept_map.get("HR"), 2026, 1000000.0),          # 10L
                (dept_map.get("Operations"), 2026, 2000000.0),  # 20L
            ]
            for dept_id, year, amount in budgets:
                if dept_id:
                    cur.execute("""
                        INSERT INTO public.budgets (id, department_id, fiscal_year, total_amount, created_by)
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (department_id, fiscal_year) DO NOTHING;
                    """, (str(uuid.uuid4()), dept_id, year, amount, admin_id))

        # 6. Sample Expenses (if empty)
        cur.execute("SELECT count(*) as cnt FROM public.expenses;")
        if cur.fetchone()["cnt"] == 0 and "employee" in user_id_map and "manager" in user_id_map:
            logger.info("Seeding realistic sample expenses...")
            emp_id = user_id_map["employee"]
            mgr_id = user_id_map["manager"]
            fin_id = user_id_map.get("finance", mgr_id)
            eng_dept = dept_map.get("Engineering")

            samples = [
                {
                    "merchant": "AWS Cloud Services",
                    "category": "Cloud Infrastructure",
                    "amount": 42500.0,
                    "date": (date.today() - timedelta(days=2)).isoformat(),
                    "description": "Production Kubernetes cluster & database monthly hosting",
                    "invoice": "INV-AWS-88210",
                    "status": "in_review",
                    "policy_status": "compliant",
                    "risk_level": "medium",
                    "ai_rec": "finance_review",
                    "ai_summary": "High-value cloud infrastructure expense. Compliant with ₹1,00,000 threshold.",
                    "ai_analysis": {
                        "category": "Cloud Infrastructure",
                        "confidence": 0.98,
                        "policy_compliant": True,
                        "duplicate_detected": False,
                        "anomaly": False,
                        "budget_impact": "medium",
                        "recommendation": "finance_review",
                        "reasons": ["High transaction value (>₹25k) triggers Finance review", "Matches historical monthly AWS billing pattern"]
                    },
                    "approvals": [
                        {"role": "manager", "order": 1, "status": "approved", "acted_by": mgr_id, "comment": "Verified production infra charges"},
                        {"role": "finance", "order": 2, "status": "pending", "acted_by": fin_id, "comment": None}
                    ]
                },
                {
                    "merchant": "Marriott Executive Suites",
                    "category": "Accommodation",
                    "amount": 12390.0,
                    "date": (date.today() - timedelta(days=5)).isoformat(),
                    "description": "Client visit stay in Bengaluru - 2 nights",
                    "invoice": "MAR-89231",
                    "status": "in_review",
                    "policy_status": "violation",
                    "risk_level": "high",
                    "ai_rec": "manager_review",
                    "ai_summary": "Policy violation: Exceeds accommodation limit of ₹8,000 by ₹4,390.",
                    "ai_analysis": {
                        "category": "Accommodation",
                        "confidence": 0.96,
                        "policy_compliant": False,
                        "duplicate_detected": False,
                        "anomaly": True,
                        "budget_impact": "low",
                        "recommendation": "manager_review",
                        "reasons": ["Hotel accommodation exceeds policy limit of ₹8,000 (Submitted: ₹12,390)", "Receipt uploaded and verified"]
                    },
                    "approvals": [
                        {"role": "manager", "order": 1, "status": "pending", "acted_by": mgr_id, "comment": None},
                        {"role": "finance", "order": 2, "status": "pending", "acted_by": fin_id, "comment": None}
                    ]
                },
                {
                    "merchant": "IndiGo Airlines",
                    "category": "Travel",
                    "amount": 6450.0,
                    "date": (date.today() - timedelta(days=12)).isoformat(),
                    "description": "Flight from Mumbai to Bengaluru for client architectural review",
                    "invoice": "6E-284912",
                    "status": "approved",
                    "policy_status": "compliant",
                    "risk_level": "low",
                    "ai_rec": "auto_approve_eligible",
                    "ai_summary": "Standard domestic flight well within ₹50,000 policy limit.",
                    "ai_analysis": {
                        "category": "Travel",
                        "confidence": 0.99,
                        "policy_compliant": True,
                        "duplicate_detected": False,
                        "anomaly": False,
                        "budget_impact": "low",
                        "recommendation": "auto_approve_eligible",
                        "reasons": ["Policy compliant", "No duplicate found", "Within employee historical baseline"]
                    },
                    "approvals": [
                        {"role": "manager", "order": 1, "status": "approved", "acted_by": mgr_id, "comment": "Approved for client meeting"}
                    ]
                },
                {
                    "merchant": "Chai Point & Team Lunch",
                    "category": "Food",
                    "amount": 1250.0,
                    "date": (date.today() - timedelta(days=8)).isoformat(),
                    "description": "Sprint planning lunch meeting refreshments",
                    "invoice": "CP-44912",
                    "status": "reimbursed",
                    "policy_status": "compliant",
                    "risk_level": "low",
                    "ai_rec": "auto_approve_eligible",
                    "ai_summary": "Routine team meal expense under daily ₹1,500 limit.",
                    "ai_analysis": {
                        "category": "Food",
                        "confidence": 0.95,
                        "policy_compliant": True,
                        "duplicate_detected": False,
                        "anomaly": False,
                        "budget_impact": "negligible",
                        "recommendation": "auto_approve_eligible",
                        "reasons": ["Under daily ₹1,500 food cap", "Valid tax receipt attached"]
                    },
                    "approvals": [
                        {"role": "manager", "order": 1, "status": "approved", "acted_by": mgr_id, "comment": "Good work on sprint"}
                    ]
                },
                {
                    "merchant": "Dell Technologies",
                    "category": "Office Supplies",
                    "amount": 68000.0,
                    "date": (date.today() - timedelta(days=1)).isoformat(),
                    "description": "4K UltraSharp Developer Monitor & Ergonomic Docking Station",
                    "invoice": "DELL-99124",
                    "status": "in_review",
                    "policy_status": "violation",
                    "risk_level": "high",
                    "ai_rec": "finance_review",
                    "ai_summary": "High Impact (₹68,000). Exceeds office supplies policy of ₹10,000. Requires Manager -> Finance -> Admin.",
                    "ai_analysis": {
                        "category": "Office Supplies",
                        "confidence": 0.97,
                        "policy_compliant": False,
                        "duplicate_detected": False,
                        "anomaly": True,
                        "budget_impact": "high",
                        "recommendation": "finance_review",
                        "reasons": ["Exceeds Office Supplies limit of ₹10,000", "Amount >₹25,000 requires 3-tier approval hierarchy (Admin final)"]
                    },
                    "approvals": [
                        {"role": "manager", "order": 1, "status": "pending", "acted_by": mgr_id, "comment": None},
                        {"role": "finance", "order": 2, "status": "pending", "acted_by": fin_id, "comment": None},
                        {"role": "admin", "order": 3, "status": "pending", "acted_by": user_id_map.get("admin", mgr_id), "comment": None}
                    ]
                }
            ]

            for s in samples:
                exp_id = str(uuid.uuid4())
                cur.execute("""
                    INSERT INTO public.expenses (
                        id, employee_id, department_id, amount, currency, category, merchant,
                        expense_date, description, invoice_number, receipt_path, status,
                        policy_status, risk_level, ai_recommendation, ai_summary, ai_analysis,
                        submitted_at, created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, 'INR', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW(), NOW()
                    );
                """, (
                    exp_id, emp_id, eng_dept, s["amount"], s["category"], s["merchant"],
                    s["date"], s["description"], s["invoice"],
                    f"{emp_id}/{exp_id}/receipt.pdf", s["status"],
                    s["policy_status"], s["risk_level"], s["ai_rec"], s["ai_summary"],
                    json.dumps(s["ai_analysis"])
                ))

                for app in s["approvals"]:
                    cur.execute("""
                        INSERT INTO public.expense_approvals (
                            id, expense_id, approver_id, approval_order, status, comment, acted_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s);
                    """, (
                        str(uuid.uuid4()), exp_id, app["acted_by"], app["order"], app["status"],
                        app["comment"], datetime.now() if app["status"] == "approved" else None
                    ))

                # Audit log for submission
                cur.execute("""
                    INSERT INTO public.audit_logs (id, user_id, expense_id, action, new_value, created_at)
                    VALUES (%s, %s, %s, 'expense_submitted', %s, NOW());
                """, (str(uuid.uuid4()), emp_id, exp_id, json.dumps({"amount": s["amount"], "merchant": s["merchant"]})))

        logger.info("Database check & seeding completed.")
