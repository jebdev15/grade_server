ALTER TABLE failure_list_window
ADD UNIQUE KEY `uq_year_sem_term` (`school_year`, `semester`, `term_type`);