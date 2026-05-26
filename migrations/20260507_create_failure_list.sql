SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Timeline window for List of Failures submission
DROP TABLE IF EXISTS `failure_list_window`;
CREATE TABLE `failure_list_window` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `school_year` int NOT NULL,
  `semester` varchar(20) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `term_type` enum('midterm','endterm') CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT 'endterm',
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `post_deadline_action` enum('auto_pass','restrict_only') CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT 'restrict_only',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uniq_failure_list_window` (`school_year`,`semester`,`term_type`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_unicode_ci ROW_FORMAT = DYNAMIC;

-- Header per class and term
DROP TABLE IF EXISTS `failure_list`;
CREATE TABLE `failure_list` (
  `failure_list_id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `class_code` int(5) UNSIGNED ZEROFILL NOT NULL,
  `faculty_id` varchar(60) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `school_year` int NOT NULL,
  `semester` varchar(20) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `term_type` enum('midterm','endterm') CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `status` enum('draft','submitted') CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT 'draft',
  `submitted_at` datetime NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`failure_list_id`) USING BTREE,
  UNIQUE KEY `uniq_failure_list_class_term` (`class_code`,`school_year`,`semester`,`term_type`) USING BTREE,
  KEY `idx_failure_list_faculty` (`faculty_id`) USING BTREE,
  CONSTRAINT `fk_failure_list_class_code` FOREIGN KEY (`class_code`) REFERENCES `class` (`class_code`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_failure_list_faculty` FOREIGN KEY (`faculty_id`) REFERENCES `faculty` (`faculty_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_unicode_ci ROW_FORMAT = DYNAMIC;

-- Students selected to fail
DROP TABLE IF EXISTS `failure_list_students`;
CREATE TABLE `failure_list_students` (
  `failure_list_student_id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `failure_list_id` int UNSIGNED NOT NULL,
  `student_id` varchar(15) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `student_grades_id` int NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`failure_list_student_id`) USING BTREE,
  UNIQUE KEY `uniq_failure_list_student` (`failure_list_id`,`student_id`) USING BTREE,
  KEY `idx_failure_list_student_grades` (`student_grades_id`) USING BTREE,
  CONSTRAINT `fk_failure_list_students_list` FOREIGN KEY (`failure_list_id`) REFERENCES `failure_list` (`failure_list_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_failure_list_students_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_failure_list_students_grades` FOREIGN KEY (`student_grades_id`) REFERENCES `student_grades` (`student_grades_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_unicode_ci ROW_FORMAT = DYNAMIC;

SET FOREIGN_KEY_CHECKS = 1;
