const express = require("express");
const multer = require("multer");
const fs = require("fs/promises");
const upload = multer({ dest: "./tmp/" });
const router = express.Router();
const { startConnection, endConnection } = require("../config/conn");
const ExcelJS = require("exceljs");
const { urlDecode } = require('url-encode-base64')

// router.get('/checkAccessLevel', async (req, res) => {
  
// })

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
        e.faculty_id,
        CASE WHEN e.status = 1 THEN 'Active' ELSE 'Inactive' END as status
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
    // const decodedURL = {
    //   faculty_id: urlDecode(faculty_id),
    //   school_year: urlDecode(school_year),
    //   semester: urlDecode(semester),
    //   class_code: urlDecode(class_code),
    // }
    const decodedParams = Object.values(req.query).map((param) => urlDecode(param))
    console.log(decodedParams);
    const params = class_code ? [decodedParams[0], decodedParams[1], decodedParams[2], decodedParams[3]] : [decodedParams[0], decodedParams[1], decodedParams[2]];
    const sqlParams = class_code ? `AND class_code = ?` : "";
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
      WHERE c.faculty_id = ? AND c.school_year = ? AND c.semester = ?
       ${sqlParams} GROUP BY c.class_code ORDER BY section`,
       params
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
        gradeSheetTitle.value="Grades Submission Log"

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
                fullName,
                class_code,
                section,
                updateMethod,
                timestamp,
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
                timestamp: dateFormatter(timestamp)
            }
            console.log({
                fullName,
                class_code,
                section,
                updateMethod,
                timestamp: dateFormatter(timestamp)
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
    const status = isLock == '1' ? 0 : 1;

    console.log({"Message": status, "isLock": status, classCodeDecode});
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
        // console.log({"Message": rows.changedRows ? 1 : 0, "isLock": rows2[0].isLock});
        res.json({"Message": rows.changedRows ? 1 : 0, "isLock": rows2[0].isLock})
        await endConnection(conn);
    } catch(err) {
        console.error(err.message);
    }
})

router.post('/updateSchedule', async (req, res) => {
    let {activity, schoolyear, semester, status, from, to} = req.body;
    // function getCurrentDateFormatted() {
    //     const date = new Date();
    //     const year = date.getFullYear();
    //     const month = String(date.getMonth() + 1).padStart(2, '0');
    //     const day = String(date.getDate()).padStart(2, '0');
    
    //     return `${year}-${month}-${day}`;
    // }
    // const currentDate = getCurrentDateFormatted();
    // status = currentDate <= to ? 'Open': 'Close'
    // console.log(status);
    const conn = await startConnection();
    try {
        const [rows] = await conn.query(
            `SELECT * FROM registrar_activity`
        );
        if(rows.length > 0){
          const [rows2] = await conn.query('UPDATE registrar_activity SET activity = ?, schoolyear = ?, semester = ?, status = ?, `from` = ?, `to` = ?',
          [activity, schoolyear, semester, status, from ,to]
          );
          console.log("Updated :", rows2.changedRows);
          res.json({"updated": rows2.changedRows, "message": "Successfully Updated"})
        } else {
          const [rows2] = await conn.query(
              'INSERT INTO registrar_activity VALUES(?, ?, ?, ?, ?, ?)',
              [activity, schoolyear, semester, status, from ,to]
          );
          console.log("Inserted :", rows2.affectedRows);
          res.json({"updated": rows2.affectedRows, "message": "Successfully Updated"})
        } 
        await endConnection(conn);
    } catch(err) {
        console.error(err.message);
    }
})

router.post('/updateClassStatus', async (req, res) => {
  const { action } = req.body;
  const conn = await startConnection();
  try {
    const [rows] = await conn.query(`SELECT * FROM registrar_activity`);
    console.log({action, schoolyear:rows[0].schoolyear, semester:rows[0].semester});
    if(action === 'Open') {
      const [rows2] = await conn.query('UPDATE class SET isLock=? WHERE school_year=? AND semester=?',[0, rows[0].schoolyear, rows[0].semester]);
      if(rows2.changedRows) {
        console.log('Updated Status to 0');
        res.json({"success": 1, "message": "Updated", 'statusToAssign': 0})
      } else {
        console.log('Already Updated Status to 0');
        res.json({"success": 0, "message": "Updated", 'statusToAssign': 0})
      }
    } else {
      const [rows2] = await conn.query('UPDATE class SET isLock=? WHERE school_year=? AND semester=?',[1, rows[0].schoolyear, rows[0].semester]);
      if(rows2.changedRows) {
        console.log('Updated Status to 1');
        res.json({"success": 1, "message": "Updated", 'statusToAssign': 1})
      } else {
        console.log('Already Updated Status to 1');
        res.json({"success": 0, "message": "Updated", 'statusToAssign': 1})
      }
    }
  } catch(err) {
    console.error(err.message);
  } finally {
    await endConnection(conn);
  }
})

router.post('/createUser', async (req, res) => {
  let { emailAddress, facultyId, accessLevel, campus } = req.body;
  let response = {};
  if(emailAddress.split('@')[1] === 'chmsu.edu.ph'){
    const conn = await startConnection();
    if(facultyId === '' && accessLevel === 'Registrar') {
      const [rowsID] = await conn.query(`SELECT * FROM emails WHERE accessLevel = ?`, ["Registrar"]);
      facultyId = `Registrar#${rowsID.length+1}`;
    }
    try {
      const [rows] = await conn.query(`SELECT * FROM emails WHERE email = ? OR faculty_id = ?`, [emailAddress, facultyId]);
      if(rows.length < 1) {
        const [rows2] = await conn.query(`INSERT INTO emails(faculty_id, email, campus, accessLevel) VALUES(?,?,?,?)`, [facultyId, emailAddress, campus, accessLevel]);
        response = rows2.affectedRows > 0 && {"success": 1, message:"Successfully Created"}
      } else {
        response = {"success": 0, message: "Email or Faculty has an existing User Account"}
      }
    } catch(err) {
      response = {"success": 0, message: "Unable to Create. Please contact the Administrator", campus}
      console.error(err.message);
    } finally {
      await endConnection(conn);
    }
  } else {
    console.log("Please use a chmsu email address");
    response = {"success": 0, message: "Please use a chmsu email address"};
  }
  res.json(response)
})

router.get('/getAccessLevels', async (req, res) => {
  const getAccessLevels = [
    "Faculty", "Part Time", "Registrar"
  ];
  res.json(getAccessLevels)
})

router.get('/getAllNoAccounts', async (req, res) => {
  const conn = await startConnection();
  try{
    let [rows] = await conn.query(`SELECT * FROM faculty WHERE faculty_id NOT IN(SELECT faculty_id FROM emails) AND faculty.status<>? ORDER BY faculty.lastname`,['deleted'])
    rows = rows.length > 0 ? rows : [];
    res.json({"success": 1, "message": "OK", rows})
  }catch(err){
    res.json({"success": 0, "message": err.message, "rows": []})
  } finally{
    await endConnection(conn);
  }
})

module.exports = router;