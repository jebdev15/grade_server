const express = require("express");
const multer = require("multer");
const fs = require("fs/promises");
const upload = multer({ dest: "./tmp/" });
const router = express.Router();
const { startConnection, endConnection } = require("../config/conn");
const ExcelJS = require("exceljs");
const { urlDecode } = require('url-encode-base64')


router.get('/getCurrentSchedule', async (req, res) => {
    const conn = await startConnection();
    try {
      const [rows] = await conn.query(`select * from registrar_activity`);
      res.json(rows)
      await endConnection(conn);
    } catch(err) {
      console.error(err.message);
    }
})

router.get('/getEmails', async (req, res) => {
    const conn = await startConnection();
    try {
      const [rows] = await conn.query(
        `select 
        e.id,
        f.lastname as lastName,
        f.firstname as firstName,
        e.email,
        e.faculty_id
        from emails as e 
        INNER JOIN faculty as f 
        USING(faculty_id) 
        GROUP BY e.id
        ORDER BY e.id ASC
        `
      );
      res.json(rows)
      await endConnection(conn);
    } catch(err) {
      console.error(err.message);
    }
})

router.get("/getSubjectLoad", async (req, res) => {
    const { faculty_id, school_year, semester, class_code } = req.query;
    const conn = await startConnection();
    try {
      const [rows] = await conn.query(
        `SELECT c.class_code as id, 
              c.subject_code,
              CONCAT(s.program_code, ' ', s.yearlevel, ' - ', s.section_code) as section,
              COUNT(DISTINCT student_id) as noStudents,
              c.isLock
      FROM class c
      INNER JOIN section s USING (section_id)
      INNER JOIN student_load sl USING (class_code)
   
      WHERE faculty_id = '${urlDecode(faculty_id)}' AND 
      school_year = ${urlDecode(school_year)}  AND 
      semester = '${urlDecode(semester)}'
       ${
         class_code ? `AND class_code = ${urlDecode(class_code)}` : ""
       }  GROUP BY c.class_code ORDER BY section`
      );
      await endConnection(conn);
      res.status(200).json(rows);
    } catch (err) {
      console.log(err.message);
      res.status(500).json(err.message);
    }
});


router.get('/getGradeSubmissionLogs', async (req, res) => {
    const {class_code} = req.query;
    const conn = await startConnection();
    try {
      const [rows] = await conn.query(
        `select
          u.id,
          u.timestamp,
          u.method
          from class c
          inner join updates u
          using(class_code)
          where class_code = ?
        `,
        [urlDecode(class_code)]
      );
      res.status(200).json(rows)
      await endConnection(conn);
    } catch(err) {
      res.status(500).json(err.message);
      console.error(err.message);
    }
})

router.get('/downloadLogs', async (req, res) => {
    const conn = await startConnection();
    try {
        const [rows] = await conn.query(`select 
                                            (select CONCAT(f.lastname,' ',f.firstname) from faculty f inner join class c where u.class_code = c.class_code and f.faculty_id = c.faculty_id) as fullName,
                                            u.class_code, 
                                            (select CONCAT(sec.program_code,' ',sec.yearlevel,' ',sec.section_code) from section sec inner join class c using(section_id) where c.class_code = u.class_code) as section,
                                            u.timestamp, 
                                            u.method as updateMethod
                                            from updates u
                                            LIMIT 0, 5
                                        `);   
        await endConnection(conn);   
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
        campusInfo.value = "Main Campus, Talisay City, Negros Occidental";
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
        gradeSheetTitle.value="Grades Submission Logs"

        sheet.mergeCells("A7", "H7");
        const academicYear = sheet.getCell("A7");
        academicYear.alignment = {
            vertical: "middle",
            horizontal: "center",
        };
        academicYear.value=`Academic Year 2023 - 2024`


        sheet.getRow(9).values = [
            'Full Name',
            'Class Code',
            'Program/Year/Section',
            'Update Method',
            'Timestamp'
        ]
        sheet.getRow(9).font = {
            bold: true,
            size: 13,
        };

        sheet.columns = [
            { key: 'fullName', width: 30 },
            { key: 'class_code', width: 15 },
            { key: 'section', width: 25 },
            { key: 'updateMethod', width: 20 },
            { key: 'timestamp', width: 25, date: true, numFmt: 'mm/dd/yyyy hh:mm:ss' },
        ]

        rows.forEach((item, i) => {
            const {
                fullName,
                class_code,
                section,
                updateMethod,
                timestamp
            } = item;

            const row = sheet.getRow(i + 10);
            row.font = {
                size: 13,
            }
            // const newDateTime = new Date(timestamp);
      
            // const formattedDate = newDateTime.toLocaleString('en-PH', {
            //     month: 'long', // Full month name
            //     day: 'numeric', // Day of the month
            //     year: 'numeric', // Full year
            //     hour12: false,
            // });

            row.values = {
                fullName,
                class_code,
                section,
                updateMethod,
                timestamp
            }
            console.log({
                fullName,
                class_code,
                section,
                updateMethod,
                timestamp
            });
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
    }
})

router.post('/updateClassCodeStatus', async (req, res) => {
    const {class_code, isLock} = req.body;
    const classCodeDecode = urlDecode(class_code);
    const status = isLock == 1 ? '0' : '1';

    // res.json({"Message": status, "isLock": status})
    const conn = await startConnection();
    try {
        const [rows] = await conn.query(
          `UPDATE class SET isLock = ? WHERE class_code = ?`,
          [status, classCodeDecode]
        );

        const [rows2] = await conn.query(
                'SELECT isLock FROM class WHERE class_code = ?',
                [classCodeDecode]
            )
        res.json({"Message": rows.changedRows ? 1 : 0, "isLock": rows2[0].isLock})
        await endConnection(conn);
    } catch(err) {
        console.error(err.message);
    }
})

router.post('/updateSchedule', async (req, res) => {
    const {activity, schoolyear, semester, status, from, to} = req.body;
    const conn = await startConnection();
    try {
        const [rows] = await conn.query(
            `DELETE FROM registrar_activity`,
            [activity, schoolyear, semester, status, from ,to]
        );
        console.log("Deleted :", rows.affectedRows);
        if(rows.affectedRows) {

            const [rows2] = await conn.query(
                `INSERT INTO registrar_activity 
                VALUES(?, ?, ?, ?, ?, ?)`,
                [activity, schoolyear, semester, status, from ,to]
            );
            console.log("Inserted :", rows2.affectedRows);
            res.json({"Message": rows2.affectedRows})
        }
        
        await endConnection(conn);
    } catch(err) {
        console.error(err.message);
    }
})

module.exports = router;