const express = require("express");
const router = express.Router();
const { startConnection, endConnection } = require("../config/conn");
const ExcelJS = require("exceljs");

const getCampus = (req) => {
  const referer = req.headers.referer || req.headers.referrer;
  const refererURL = new URL(referer);
  const refererOrigin = refererURL.origin;
  console.log(`Referer: ${refererOrigin}`);
  let campusInfoValue;
  switch(refererOrigin) {
    case 'http://localhost:3000':
      campusInfoValue = 'Local Campus, Local City, Negros Occidental';
      break;
    case 'https://staging-gs.chmsu.edu.ph':
      campusInfoValue = 'Staging Campus, Staging City, Negros Occidental';
      break;
    case 'https://gs.chmsu.edu.ph':
      campusInfoValue = 'Main Campus, Talisay City, Negros Occidental';
      break;
    case 'https://ft-gs.chmsu.edu.ph':
      campusInfoValue = 'Fortune Towne Campus, Bacolod City, Negros Occidental';
      break;
    case 'https://bin-gs.chmsu.edu.ph':
      campusInfoValue = 'Binalbagan Campus, Binalbagan, Negros Occidental';
      break;
    case 'https://ali-gs.chmsu.edu.ph':
      campusInfoValue = 'Alijis Campus, Bacolod City, Negros Occidental';
      break;
    default:
      campusInfoValue = 'Default Campus, Default City, Negros Occidental';
  }
  console.log(refererOrigin, campusInfoValue);
  return campusInfoValue
}

const getCurrentSemester = (semester) => {
  let currentSemester;
  switch(semester) {
    case "1st":
      currentSemester = "First Semester";
      break;
    case "2nd":
      currentSemester = "Second Semester";
      break;
    case "summer":
      currentSemester = "Summer";
      break;
  }
  return { currentSemester }
}
// Download Grade Sheet Submission Logs(currently used)
router.get('/downloadGradeSheetSubmissionLogs', async (req, res) => {
  const {toGenerate, schoolYear, semester} = req.query;
  const { currentSemester } = getCurrentSemester(semester);
  const campusInfoValue = getCampus(req);
  const conn = await startConnection(req);
  try {
      const [rows] = await conn.query(`SELECT 
                                        CONCAT(TRIM(f.lastname),', ',TRIM(f.firstname)) as fullName,
                                        c.class_code,
                                        c.subject_code,
                                        CONCAT(sec.program_code, ' ', sec.yearlevel, ' - ', sec.section_code) as section,
                                        COALESCE(u.term_type,cl.term_type) as term_type,
                                        MAX(u.timestamp) as lastUpdate,
                                        MAX(CASE WHEN cl.action_type = 'Submitted' THEN cl.timestamp END) AS submittedAt
                                      FROM 
                                        updates u
                                      LEFT JOIN class c
                                        ON c.class_code = u.class_code
                                      LEFT JOIN faculty f
                                        ON f.faculty_id = c.faculty_id
                                      LEFT JOIN section sec
                                        ON sec.section_id = c.section_id
                                      LEFT JOIN tbl_class_update_logs cl 
                                        ON cl.class_code = u.class_code
                                        AND cl.term_type = u.term_type
                                      LEFT JOIN emails e
                                        ON e.faculty_id = f.faculty_id
                                      WHERE c.school_year = ? 
                                        AND c.semester = ?
                                      GROUP BY 
                                        f.lastname, f.firstname, 
                                        c.class_code, 
                                        c.subject_code, 
                                        sec.program_code, 
                                        sec.yearlevel, 
                                        sec.section_code, 
                                        c.school_year, 
                                        c.semester,
                                        u.term_type
                                      ORDER BY 
                                          fullName`, 
                                      [schoolYear, semester, 'Administrator', 'Registrar']);     
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "CHMSU Grading System";
      workbook.created = new Date();
      workbook.calcProperties.fullCalcOnLoad = true;          
      const sheet = workbook.addWorksheet(toGenerate, {
          pageSetup: {
            fitToPage: true,
            orientation: "portrait",
            margins: {
              left: 0.5,
              right: 0.5,
              top: 0.5,
              bottom: 0.5,
              header: 0,
              footer: 0,
            },
          },
        });    
      //HEADER
      sheet.mergeCells("A1", "H1");
      const republic = sheet.getCell("A1");
      republic.value = "Republic of the Philippines";
      republic.alignment = {
          vertical: "middle",
          horizontal: "center",
      }; 
      sheet.mergeCells("A2", "H2");
      const nameofSchool = sheet.getCell("A2");
      nameofSchool.value = "CARLOS HILADO MEMORIAL STATE UNIVERSITY";
      nameofSchool.alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      nameofSchool.font = {
        size: 12,
        bold: true,
      };       
      sheet.mergeCells("A3", "H3");
      const campusInfo = sheet.getCell("A3");
      campusInfo.value = campusInfoValue;
      campusInfo.alignment = {
          vertical: "middle",
          horizontal: "center",
      };
      const logoPic = workbook.addImage({
          filename: `${__dirname}/../public/images/logo.png`,
          extension: "png",
      });
      sheet.addImage(logoPic, {
          tl: {
              col: 1,
              row: 1,
          },
          ext: {
              width: 100,
              height: 100,
          },
      });
      sheet.mergeCells("A5", "H5");
      const officeOfReg = sheet.getCell("A5");
      officeOfReg.value = "Office of the Registrar";
      officeOfReg.alignment = {
          vertical: "middle",
          horizontal: "center",
      };
      officeOfReg.font = {
          size: 12,
          bold: true,
      };
      
      sheet.mergeCells("A6", "H6");
      const gradeSheetTitle = sheet.getCell("A6");
      gradeSheetTitle.alignment = {
          vertical: "middle",
          horizontal: "center",
      };
      gradeSheetTitle.value=toGenerate;

      sheet.mergeCells("A7", "H7");
      const academicYear = sheet.getCell("A7");
      academicYear.alignment = {
          vertical: "middle",
          horizontal: "center",
      };
      academicYear.value=`Academic Year: ${schoolYear} - ${parseInt(schoolYear) + 1}, ${currentSemester}`;

      sheet.getRow(9).values = [
          'Full Name',
          'Class Code',
          'Subject Code',
          'Program/Year Level/Section',
          'Term Type',
          'Last Update',
          'Submitted At'
      ]
      sheet.getRow(9).font = {
          bold: true,
          size: 13,
      };

      sheet.columns = [
          { key: 'fullName', width: 40 },
          { key: 'class_code', width: 15 },
          { key: 'subject_code', width: 15 },
          { key: 'section', width: 30 },
          { key: 'term_type', width: 15 },
          { key: 'lastUpdate', width: 30, date: true, numFmt: 'MM/DD/yyyy hh:mm:ss', dateUTC: true },
          { key: 'submittedAt', width: 30, date: true, numFmt: 'MM/DD/yyyy hh:mm:ss', dateUTC: true },
      ]

      const dateFormatter = (date) => {
        const newDateTime = new Date(date);
    
        const formattedDate = newDateTime.toLocaleString("en-PH", {
          month: "long", // Full month name
          day: "numeric", // Day of the month
          year: "numeric", // Full year
          hour: "numeric", // Display Hour/s
          minute: "numeric", // Display Minute/s
        });
    
        return formattedDate;
      };

      rows.forEach((item, i) => {
          const {
            fullName,
            class_code,
            subject_code,
            section,
            term_type,
            lastUpdate,
            submittedAt
          } = item;

          const row = sheet.getRow(i + 10);
          row.font = {
              size: 13,
          }

          row.values = {
            fullName,
            class_code,
            subject_code,
            section,
            term_type,
            lastUpdate: lastUpdate === null ? '' : dateFormatter(lastUpdate),
            submittedAt: submittedAt === null ? '' : dateFormatter(submittedAt)
          }
      })

      res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", "attachment; filename=" + "File.xlsx");
      workbook.xlsx.write(res).then(() => res.end());
  } catch(err) {
    console.error(err);
    res.status(500).json(err);
  } finally {
    await endConnection(conn);
  }
})

router.get('/downloadClassStatusLogs', async (req, res) => {
  const {toGenerate, from, to} = req.query;
  const campusInfoValue = getCampus(req);
  const conn = await startConnection(req);
  try {
      const [rows] = await conn.query(`SELECT 
                                        cl.*,
                                        CONCAT(sec.program_code, sec.yearlevel, ' - ', sec.section_code) as section,
                                        c.school_year,
                                        c.semester   
                                      FROM tbl_class_update_logs cl
                                      LEFT JOIN class c
                                        ON cl.class_code = c.class_code 
                                      LEFT JOIN section sec
                                        ON sec.section_id = c.section_id
                                      WHERE 
                                        cl.action_type <> 'Submitted'
                                        AND cl.timestamp BETWEEN ? and ? 
                                      ORDER BY 
                                        cl.timestamp DESC`, 
                                      [from, to]);   
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "CHMSU Grading System";
      workbook.created = new Date();
      workbook.calcProperties.fullCalcOnLoad = true;          
      const sheet = workbook.addWorksheet(toGenerate, {
          pageSetup: {
            fitToPage: true,
            orientation: "portrait",
            margins: {
              left: 0.5,
              right: 0.5,
              top: 0.5,
              bottom: 0.5,
              header: 0,
              footer: 0,
            },
          },
        });    
      //HEADER
      sheet.mergeCells("A1", "H1");
      const republic = sheet.getCell("A1");
      republic.value = "Republic of the Philippines";
      republic.alignment = {
          vertical: "middle",
          horizontal: "center",
      }; 
      sheet.mergeCells("A2", "H2");
      const nameofSchool = sheet.getCell("A2");
      nameofSchool.value = "CARLOS HILADO MEMORIAL STATE UNIVERSITY";
      nameofSchool.alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      nameofSchool.font = {
        size: 12,
        bold: true,
      };       
      sheet.mergeCells("A3", "H3");
      const campusInfo = sheet.getCell("A3");
      campusInfo.value = campusInfoValue;
      campusInfo.alignment = {
          vertical: "middle",
          horizontal: "center",
      };
      const logoPic = workbook.addImage({
          filename: `${__dirname}/../public/images/logo.png`,
          extension: "png",
      });
      sheet.addImage(logoPic, {
          tl: {
              col: 1,
              row: 1,
          },
          ext: {
              width: 100,
              height: 100,
          },
      });
      sheet.mergeCells("A5", "H5");
      const officeOfReg = sheet.getCell("A5");
      officeOfReg.value = "Office of the Registrar";
      officeOfReg.alignment = {
          vertical: "middle",
          horizontal: "center",
      };
      officeOfReg.font = {
          size: 12,
          bold: true,
      };
      
      sheet.mergeCells("A6", "H6");
      const gradeSheetTitle = sheet.getCell("A6");
      gradeSheetTitle.alignment = {
          vertical: "middle",
          horizontal: "center",
      };
      gradeSheetTitle.value=toGenerate;

      sheet.mergeCells("A7", "H7");
      const academicYear = sheet.getCell("A7");
      academicYear.alignment = {
          vertical: "middle",
          horizontal: "center",
      };
      academicYear.value=`${from} - ${to}`

      sheet.getRow(9).values = [
          'Email Used',
          'Class Code',
          'Program/Year Level/Section',
          'School Year',
          'Semester',
          'Status',
          'Timestamp'
      ]
      sheet.getRow(9).font = {
          bold: true,
          size: 13,
      };

      sheet.columns = [
          { key: 'email_used', width: 35 },
          { key: 'class_code', width: 15 },
          { key: 'section', width: 25 },
          { key: 'school_year', width: 15 },
          { key: 'semester', width: 15 },
          { key: 'action_type', width: 15 },
          { key: 'timestamp', width: 25, date: true, numFmt: 'MM/DD/yyyy hh:mm:ss', dateUTC: true },
      ]

      const dateFormatter = (date) => {
        const newDateTime = new Date(date);
    
        const formattedDate = newDateTime.toLocaleString("en-PH", {
          month: "long", // Full month name
          day: "numeric", // Day of the month
          year: "numeric", // Full year
          hour: "numeric", // Display Hour/s
          minute: "numeric", // Display Minute/s
        });
    
        return formattedDate;
      };

      rows.forEach((item, i) => {
          const {
            email_used,
            action_type,
            section,
            school_year,
            semester,
            class_code,
            timestamp,
          } = item;

          const row = sheet.getRow(i + 10);
          row.font = {
              size: 13,
          }

          row.values = {
            email_used,
            class_code,
            section,
            school_year: `${school_year}-${school_year + 1}`,
            semester,
            action_type,
            timestamp: dateFormatter(timestamp)
          }
      })

      res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", "attachment; filename=" + "File.xlsx");
      workbook.xlsx.write(res).then(() => res.end());
  } catch(err) {
    res.status(500).json(err.message);
    console.error(err.message);
  } finally {
    await endConnection(conn);
  }
})

router.get('/downloadAccountLogs', async (req, res) => {
    const {toGenerate, from, to} = req.query;
    const campusInfoValue = getCampus(req);
    const conn = await startConnection(req);
    try {
        const [rows] = await conn.query(`select 
                                            email_logs.old_faculty_id,
                                            email_logs.new_faculty_id,
                                            email_logs.old_email,
                                            email_logs.new_email,
                                            email_logs.old_accessLevel,
                                            email_logs.new_accessLevel,
                                            CASE WHEN email_logs.old_status = 1 THEN 'Active' ELSE 'Deactivated' END as old_status, 
                                            CASE WHEN email_logs.new_status = 1 THEN 'Active' ELSE 'Deactivated' END as new_status,
                                            email_logs.action_type,
                                            email_logs.email_used,
                                            email_logs.created_at
                                            from email_logs
                                            where email_logs.created_at between ? and ?
                                        `, [from, to]);   
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "CHMSU Grading System";
        workbook.created = new Date();
        workbook.calcProperties.fullCalcOnLoad = true;          
        const sheet = workbook.addWorksheet("Logs", {
            pageSetup: {
              fitToPage: true,
              orientation: "portrait",
              margins: {
                left: 0.5,
                right: 0.5,
                top: 0.5,
                bottom: 0.5,
                header: 0,
                footer: 0,
              },
            },
          });    
        //HEADER
        sheet.mergeCells("A1", "H1");
        const republic = sheet.getCell("A1");
        republic.value = "Republic of the Philippines";
        republic.alignment = {
            vertical: "middle",
            horizontal: "center",
        }; 
        sheet.mergeCells("A2", "H2");
        const nameofSchool = sheet.getCell("A2");
        nameofSchool.value = "CARLOS HILADO MEMORIAL STATE UNIVERSITY";
        nameofSchool.alignment = {
          vertical: "middle",
          horizontal: "center",
        };
        nameofSchool.font = {
          size: 12,
          bold: true,
        };       
        sheet.mergeCells("A3", "H3");
        const campusInfo = sheet.getCell("A3");
        campusInfo.value = campusInfoValue;
        campusInfo.alignment = {
            vertical: "middle",
            horizontal: "center",
        };
        const logoPic = workbook.addImage({
            filename: `${__dirname}/../public/images/logo.png`,
            extension: "png",
        });
        sheet.addImage(logoPic, {
            tl: {
                col: 1,
                row: 1,
            },
            ext: {
                width: 100,
                height: 100,
            },
        });
        sheet.mergeCells("A5", "H5");
        const officeOfReg = sheet.getCell("A5");
        officeOfReg.value = "Office of the Registrar";
        officeOfReg.alignment = {
            vertical: "middle",
            horizontal: "center",
        };
        officeOfReg.font = {
            size: 12,
            bold: true,
        };
        
        sheet.mergeCells("A6", "H6");
        const gradeSheetTitle = sheet.getCell("A6");
        gradeSheetTitle.alignment = {
            vertical: "middle",
            horizontal: "center",
        };
        gradeSheetTitle.value=toGenerate;
  
        sheet.mergeCells("A7", "H7");
        const academicYear = sheet.getCell("A7");
        academicYear.alignment = {
            vertical: "middle",
            horizontal: "center",
        };
        academicYear.value=`${from} - ${to}`
  
  
        sheet.getRow(9).values = [
            'Old Faculty ID',
            'New Faculty ID',
            'Old Email',
            'New Email',
            'Old Access Level',
            'New Access Level',
            'Old Status',
            'New Status',
            'Action Type',
            'Email Used',
            'Timestamp',
        ]
        sheet.getRow(9).font = {
            bold: true,
            size: 13,
        };
  
        sheet.columns = [
            { key: 'old_faculty_id', width: 15 },
            { key: 'new_faculty_id', width: 15 },
            { key: 'old_email', width: 25 },
            { key: 'new_email', width: 25 },
            { key: 'old_accessLevel', width: 20 },
            { key: 'new_accessLevel', width: 20 },
            { key: 'old_status', width: 20 },
            { key: 'new_status', width: 20 },
            { key: 'action_type', width: 20 },
            { key: 'email_used', width: 20 },
            { key: 'created_at', width: 25, date: true, numFmt: 'MM/DD/yyyy hh:mm:ss', dateUTC: true },
        ]
  
        const dateFormatter = (date) => {
          const newDateTime = new Date(date);
      
          const formattedDate = newDateTime.toLocaleString("en-PH", {
            month: "long", // Full month name
            day: "numeric", // Day of the month
            year: "numeric", // Full year
            hour: "numeric", // Display Hour/s
            minute: "numeric", // Display Minute/s
          });
      
          return formattedDate;
        };
  
        rows.forEach((item, i) => {
            const {
                old_faculty_id,
                new_faculty_id,
                old_email,
                new_email,
                old_accessLevel,
                new_accessLevel,
                old_status,
                new_status,
                action_type,
                email_used,
                created_at
            } = item;
  
            const row = sheet.getRow(i + 10);
            row.font = {
                size: 13,
            }
  
            row.values = {
                old_faculty_id,
                new_faculty_id,
                old_email,
                new_email,
                old_accessLevel,
                new_accessLevel,
                old_status,
                new_status,
                action_type,
                email_used,
                created_at: dateFormatter(created_at)
            }
        })
  
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader("Content-Disposition", "attachment; filename=" + "File.xlsx");
        workbook.xlsx.write(res).then(() => res.end());
    } catch(err) {
      res.status(500).json(err.message);
      console.error(err.message);
    } finally {
      await endConnection(conn);
    }
})

router.get('/downloadDeadlineLogs', async (req, res) => {
  const {toGenerate, schoolYear, semester} = req.query;
  const campusInfoValue = getCampus(req);
  const { currentSemester } = getCurrentSemester(semester);
  const conn = await startConnection(req);
  try {
      const [rows] = await conn.query(`select * from deadline_log where schoolyear = ? and semester = ? order by timestamp desc`,[schoolYear, semester]);   
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "CHMSU Grading System";
      workbook.created = new Date();
      workbook.calcProperties.fullCalcOnLoad = true;          
      const sheet = workbook.addWorksheet("Logs", {
          pageSetup: {
            fitToPage: true,
            orientation: "portrait",
            margins: {
              left: 0.5,
              right: 0.5,
              top: 0.5,
              bottom: 0.5,
              header: 0,
              footer: 0,
            },
          },
        });    
      //HEADER
      sheet.mergeCells("A1", "H1");
      const republic = sheet.getCell("A1");
      republic.value = "Republic of the Philippines";
      republic.alignment = {
          vertical: "middle",
          horizontal: "center",
      }; 
      sheet.mergeCells("A2", "H2");
      const nameofSchool = sheet.getCell("A2");
      nameofSchool.value = "CARLOS HILADO MEMORIAL STATE UNIVERSITY";
      nameofSchool.alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      nameofSchool.font = {
        size: 12,
        bold: true,
      };       
      sheet.mergeCells("A3", "H3");
      const campusInfo = sheet.getCell("A3");
      campusInfo.value = campusInfoValue;
      campusInfo.alignment = {
          vertical: "middle",
          horizontal: "center",
      };
      const logoPic = workbook.addImage({
          filename: `${__dirname}/../public/images/logo.png`,
          extension: "png",
      });
      sheet.addImage(logoPic, {
          tl: {
              col: 1,
              row: 1,
          },
          ext: {
              width: 100,
              height: 100,
          },
      });
      sheet.mergeCells("A5", "H5");
      const officeOfReg = sheet.getCell("A5");
      officeOfReg.value = "Office of the Registrar";
      officeOfReg.alignment = {
          vertical: "middle",
          horizontal: "center",
      };
      officeOfReg.font = {
          size: 12,
          bold: true,
      };
      
      sheet.mergeCells("A6", "H6");
      const gradeSheetTitle = sheet.getCell("A6");
      gradeSheetTitle.alignment = {
          vertical: "middle",
          horizontal: "center",
      };
      gradeSheetTitle.value=toGenerate;

      sheet.mergeCells("A7", "H7");
      const academicYear = sheet.getCell("A7");
      academicYear.alignment = {
          vertical: "middle",
          horizontal: "center",
      };
      academicYear.value=`Academic Year ${schoolYear} - ${parseInt(schoolYear) + 1}, ${currentSemester}`

      sheet.getRow(9).values = [
          'Email Used',
          'Activity',
          'Status',
          'From',
          'To',
          'Timestamp',
      ]
      sheet.getRow(9).font = {
          bold: true,
          size: 13,
      };

      sheet.columns = [
          { key: 'email_used', width: 20 },
          { key: 'activity', width: 15 },
          { key: 'status', width: 15 },
          { key: 'from', width: 15 },
          { key: 'to', width: 15 },
          { key: 'timestamp', width: 25, date: true, numFmt: 'MM/DD/yyyy hh:mm:ss', dateUTC: true },
      ]

      const dateFormatter = (date) => {
        const newDateTime = new Date(date);
    
        const formattedDate = newDateTime.toLocaleString("en-PH", {
          month: "long", // Full month name
          day: "numeric", // Day of the month
          year: "numeric", // Full year
          hour: "numeric", // Display Hour/s
          minute: "numeric", // Display Minute/s
        });
    
        return formattedDate;
      };

      const dateFormat = (date) => {
        const newDateTime = new Date(date);
    
        const formattedDate = newDateTime.toLocaleString("en-PH", {
          month: "long", // Full month name
          day: "numeric", // Day of the month
          year: "numeric", // Full year
        });
    
        return formattedDate;
      };

      rows.forEach((item, i) => {
          const {
              email_used,
              activity,
              status,
              from,
              to,
              timestamp
          } = item;

          const row = sheet.getRow(i + 10);
          row.font = {
              size: 13,
          }

          row.values = {
              email_used,
              activity,
              status,
              from: dateFormat(from),
              to: dateFormat(to),
              timestamp: dateFormatter(timestamp)
          }
      })

      res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", "attachment; filename=" + "File.xlsx");
      workbook.xlsx.write(res).then(() => res.end());
  } catch(err) {
    res.status(500).json(err.message);
    console.error(err.message);
  } finally {
    await endConnection(conn);
  }
})

module.exports = router