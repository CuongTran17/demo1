-- Seed a few starter combos from the current course catalog so the bundles page is not empty.

INSERT INTO course_bundles
    (bundle_name, description, thumbnail, bundle_price, original_price, is_active)
SELECT
    'Python Starter Pro',
    'Combo Python từ cơ bản đến dữ liệu, phù hợp cho người mới bắt đầu học lập trình và phân tích dữ liệu.',
    NULL,
    2599000,
    3397000,
    1
WHERE NOT EXISTS (
    SELECT 1 FROM course_bundles WHERE bundle_name = 'Python Starter Pro'
);

UPDATE course_bundles
SET description = 'Combo Python từ cơ bản đến dữ liệu, phù hợp cho người mới bắt đầu học lập trình và phân tích dữ liệu.',
    thumbnail = NULL,
    bundle_price = 2599000,
    original_price = 3397000,
    is_active = 1
WHERE bundle_name = 'Python Starter Pro';

SET @bundle_python := (SELECT bundle_id FROM course_bundles WHERE bundle_name = 'Python Starter Pro' LIMIT 1);
DELETE FROM course_bundle_items WHERE bundle_id = @bundle_python;
INSERT INTO course_bundle_items (bundle_id, course_id, sort_order) VALUES
    (@bundle_python, 'python-basics', 0),
    (@bundle_python, 'python-data', 1),
    (@bundle_python, 'excel-data', 2);


INSERT INTO course_bundles
    (bundle_name, description, thumbnail, bundle_price, original_price, is_active)
SELECT
    'Finance Growth Pack',
    'Combo tài chính và đầu tư dành cho người muốn nắm từ nền tảng cá nhân đến chứng khoán và Forex.',
    NULL,
    2399000,
    4097000,
    1
WHERE NOT EXISTS (
    SELECT 1 FROM course_bundles WHERE bundle_name = 'Finance Growth Pack'
);

UPDATE course_bundles
SET description = 'Combo tài chính và đầu tư dành cho người muốn nắm từ nền tảng cá nhân đến chứng khoán và Forex.',
    thumbnail = NULL,
    bundle_price = 2399000,
    original_price = 4097000,
    is_active = 1
WHERE bundle_name = 'Finance Growth Pack';

SET @bundle_finance := (SELECT bundle_id FROM course_bundles WHERE bundle_name = 'Finance Growth Pack' LIMIT 1);
DELETE FROM course_bundle_items WHERE bundle_id = @bundle_finance;
INSERT INTO course_bundle_items (bundle_id, course_id, sort_order) VALUES
    (@bundle_finance, 'finance-basic', 0),
    (@bundle_finance, 'personal-finance', 1),
    (@bundle_finance, 'investment', 2),
    (@bundle_finance, 'forex', 3);


INSERT INTO course_bundles
    (bundle_name, description, thumbnail, bundle_price, original_price, is_active)
SELECT
    'Marketing Accelerator',
    'Combo marketing thực chiến với SEO, quảng cáo và social media để triển khai chiến dịch hiệu quả.',
    NULL,
    3799000,
    5797000,
    1
WHERE NOT EXISTS (
    SELECT 1 FROM course_bundles WHERE bundle_name = 'Marketing Accelerator'
);

UPDATE course_bundles
SET description = 'Combo marketing thực chiến với SEO, quảng cáo và social media để triển khai chiến dịch hiệu quả.',
    thumbnail = NULL,
    bundle_price = 3799000,
    original_price = 5797000,
    is_active = 1
WHERE bundle_name = 'Marketing Accelerator';

SET @bundle_marketing := (SELECT bundle_id FROM course_bundles WHERE bundle_name = 'Marketing Accelerator' LIMIT 1);
DELETE FROM course_bundle_items WHERE bundle_id = @bundle_marketing;
INSERT INTO course_bundle_items (bundle_id, course_id, sort_order) VALUES
    (@bundle_marketing, 'digital-marketing', 0),
    (@bundle_marketing, 'social-media', 1),
    (@bundle_marketing, 'facebook-ads', 2),
    (@bundle_marketing, 'google-ads', 3);


INSERT INTO course_bundles
    (bundle_name, description, thumbnail, bundle_price, original_price, is_active)
SELECT
    'Accounting Master Path',
    'Combo kế toán và Excel dành cho người học muốn đi từ cơ bản đến thực hành trên phần mềm.',
    NULL,
    1999000,
    2797000,
    1
WHERE NOT EXISTS (
    SELECT 1 FROM course_bundles WHERE bundle_name = 'Accounting Master Path'
);

UPDATE course_bundles
SET description = 'Combo kế toán và Excel dành cho người học muốn đi từ cơ bản đến thực hành trên phần mềm.',
    thumbnail = NULL,
    bundle_price = 1999000,
    original_price = 2797000,
    is_active = 1
WHERE bundle_name = 'Accounting Master Path';

SET @bundle_accounting := (SELECT bundle_id FROM course_bundles WHERE bundle_name = 'Accounting Master Path' LIMIT 1);
DELETE FROM course_bundle_items WHERE bundle_id = @bundle_accounting;
INSERT INTO course_bundle_items (bundle_id, course_id, sort_order) VALUES
    (@bundle_accounting, 'accounting-basic', 0),
    (@bundle_accounting, 'excel-accounting', 1),
    (@bundle_accounting, 'accounting-misa', 2);
