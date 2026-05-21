ALTER TABLE upload_grade_extensions
ADD UNIQUE KEY uq_upload_grade_extensions (email, class_code, school_year, semester);