const express = require("express");
const multer = require("multer");
const fs = require("fs/promises");
const upload = multer({ dest: "./tmp/" });
const router = express.Router();
const { startConnection, endConnection } = require("../config/conn");
const ExcelJS = require("exceljs");

router.get("/login", async (req, res) => {
  const conn = await startConnection();
  const { email } = req.query;
  const [rows] = await conn.query(
    `SELECT faculty_id FROM emails WHERE email = '${email}'`
  );
  await endConnection(conn);
  res.status(200).json(rows);
});

router.get('/getCurrentSchoolYear', async (req, res) => {
  const { getYear } = req.query;
  // const data = getYear === "currentYearSetBySystem" ? 2022 : 1970;
  // res.status(200).json({"currentYearSetBySystem": data})
if(getYear === "currentYearSetBySystem"){
  const conn = await startConnection();
  try {
    const [rows] = await conn.query("SELECT * FROM registrar_activity");
    await endConnection(conn);
    res.status(200).json(rows);
  } catch (err) {
    console.log(err.message);
    res.status(500).json(err.message);
  }
}
})

router.get("/getLoad", async (req, res) => {
  const { faculty_id, school_year, semester, class_code } = req.query;
  const conn = await startConnection();
  try {
    const [rows] = await conn.query(
      `SELECT c.class_code, 
            c.subject_code,
            CONCAT(s.program_code, ' ', s.yearlevel, ' - ', s.section_code) as section,
            COUNT(DISTINCT student_id) as noStudents,
             (SELECT timestamp FROM updates INNER JOIN class USING (class_code) WHERE class_code = c.class_code ORDER BY id DESC LIMIT 1) as timestamp,
             (SELECT method FROM updates INNER JOIN class USING (class_code) WHERE class_code = c.class_code ORDER BY id DESC LIMIT 1) as method
    FROM class c
    INNER JOIN section s USING (section_id)
    INNER JOIN student_load sl USING (class_code)
 
    WHERE faculty_id = '${faculty_id}' AND 
    school_year = ${school_year}  AND 
    semester = '${semester}'
     ${
       class_code ? `AND class_code = ${class_code}` : ""
     }  GROUP BY c.class_code ORDER BY section`
    );
    await endConnection(conn);
    res.status(200).json(rows);
  } catch (err) {
    console.log(err.message);
    res.status(500).json(err.message);
  }
});
router.get("/getGradeTable", async (req, res) => {
  const { class_code, semester, currentSchoolYear } = req.query;
  const conn = await startConnection();
  try {
    const [rows] = await conn.query(
      `SELECT sg.student_grades_id as sg_id, s.student_id, CONCAT(s.student_lastname , ', ', s.student_firstname) as name, sg.mid_grade, sg.final_grade, sg.remarks as dbRemark
  FROM class c 
  INNER JOIN student_load sl
    USING (class_code) 
  INNER JOIN student s 
    USING (student_id)
  INNER JOIN student_grades sg
    USING (student_id)
  WHERE class_code = '${class_code}'AND 
  sg.school_year = '${currentSchoolYear}' AND 
  sg.semester = '${semester}' 
  GROUP BY name
  ORDER BY name`
    );
    await endConnection(conn);
    res.status(200).json(rows);
  } catch (err) {
    console.log(err.message);

    res.status(500).json(err.message);
  }
});

router.get("/getExcelFile", async (req, res) => {
  const { class_code, semester, currentSchoolYear, name, classSection } =
    req.query;
  const conn = await startConnection();

  const [data] = await conn.query(
    `SELECT c.subject_code, sg.student_grades_id, s.student_id, CONCAT(s.student_lastname , ', ', s.student_firstname) as name, sg.mid_grade, sg.final_grade, sg.remarks
  FROM class c 
  INNER JOIN student_load sl
    USING (class_code) 
  INNER JOIN student s 
    USING (student_id)
  INNER JOIN student_grades sg
    USING (student_id)
  WHERE class_code = '${class_code}'AND 
  sg.school_year = '${currentSchoolYear}' AND 
  sg.semester = '${semester}' 
  GROUP BY name
  ORDER BY name`
  );
  await endConnection(conn);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CHMSU Grading System";
  workbook.created = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;

  const sheet = workbook.addWorksheet(class_code, {
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

  let semesterWord = "";
  switch (semester) {
    case "1st":
      semesterWord = "1st Semester";
      break;
    case "2nd":
      semesterWord = "2nd Semester";
      break;
    case "summer":
      semesterWord = "Summer";
      break;
    default:
      break;
  }
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
  gradeSheetTitle.value = "Student Grade Sheet";
  sheet.mergeCells("A7", "H7");
  const classInfo = sheet.getCell("A7");
  classInfo.value = `${semesterWord}, A.Y. ${currentSchoolYear} - ${
    parseInt(currentSchoolYear) + 1
  }`;
  classInfo.alignment = {
    vertical: "middle",
    horizontal: "center",
  };

  const subjectCode = sheet.getCell("A9");
  subjectCode.value = `Subject:     ${data[0].subject_code}`;
  subjectCode.font = {
    bold: true,
    size: 13,
  };

  const instructor = sheet.getCell("A10");
  instructor.value = `Instructor:  ${name}`;
  instructor.font = {
    bold: true,
    size: 13,
  };

  const section = sheet.getCell("D10");
  section.value = `Section:  ${decodeURI(classSection)}`;
  section.font = {
    bold: true,
    size: 13,
  };
  sheet.getRow(13).values = [
    "Grade ID",
    "Student ID",
    "Name",
    "Midterm",
    "Endterm",
    "Average",
    "Status",
    "Remark",
  ];
  sheet.getRow(13).font = {
    bold: true,
  };
  sheet.columns = [
    { key: "student_grades_id", width: 10 },
    { key: "student_id", width: 10 },
    { key: "name", width: 50 },
    { key: "mid_grade", width: 10 },
    { key: "final_grade", width: 10 },
    { key: "grade", width: 10 },
    { key: "status", width: 12 },
    { key: "remarks", width: 12 },
  ];

  data.forEach((item, i) => {
    const {
      student_grades_id,
      student_id,
      name,
      mid_grade,
      final_grade,
      remarks,
    } = item;
    const currentRow = i + 14;
    const row = sheet.getRow(currentRow);
    row.font = {
      size: 13,
    };

    let remark = null;
    let status = null;
    switch (remarks) {
      case "passed":
        status = "Passed";
        break;
      case "failed":
        status = "Failed";
        break;
      case "inc":
        remark = "Incomplete";
        break;
      case "drp":
        remark = "Dropped";
        break;
      case "ng":
        remark = "No Grade";
        break;
      case "na":
        remark = "No Attendance";
        break;
      case "w":
        remark = "Withdrawn";
        break;
      default:
        break;
    }
    row.values = {
      student_grades_id,
      student_id,
      name,
      mid_grade,
      final_grade,
      status,
      remarks: remark,
    };
    sheet.getCell(`F${currentRow}`).value = {
      formula: `IF(COUNTIF(D${currentRow}:E${currentRow}, "<>0") > 1, ROUND(AVERAGE(D${currentRow}:E${currentRow}), 0), "")`,
      result: Math.round(
        (parseInt(item.mid_grade) + parseInt(item.final_grade)) / 2
      ),
    };
    sheet.getCell(`G${currentRow}`).value = {
      formula: `IF(COUNTIF(D${currentRow}:E${currentRow}, "<>0") > 1, IF(AVERAGE(D${currentRow}:E${currentRow}) > 75,                                                                                                                                                      "Passed", "Failed"), "")`,
      result: status,
    };
    sheet.getCell(`H${currentRow}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"Incomplete, Dropped, No Attendance, No Grade,  Withdrawn"'],
    };
  });

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", "attachment; filename=" + "File.xlsx");
  workbook.xlsx.write(res).then(() => res.end());
});

router.post("/updateGrade", async (req, res) => {
  const conn = await startConnection();
  const countAffectedRows = async (grade) => {
    const { sg_id, mid_grade, final_grade, dbRemark, average, status } = grade;

    try {
      const [rows] = await conn.query(
        "UPDATE student_grades SET mid_grade = ?, final_grade = ?, remarks = ?, grade = ? WHERE student_grades_id = ? ",
        [
          mid_grade,
          final_grade,
          dbRemark || status.toLowerCase(),
          average,
          sg_id,
        ]
      );
      await conn.execute(
        "INSERT INTO grade_logs (student_grades_id, status) VALUES(?, ?)",
        [sg_id, "NP"]
      );
      return rows.affectedRows;
    } catch (err) {
      console.error(err.message);
    }
  };

  const { grades, class_code, method } = req.body;

  try {
    const affectedRowsArr = await Promise.all(
      grades.map(async (grade) => await countAffectedRows(grade))
    );

    const totalAffectedRows = affectedRowsArr.reduce(
      (prev, current) => prev + current,
      0
    );
    await conn.query("INSERT INTO updates (class_code, method) VALUES(?, ?)", [
      class_code,
      method,
    ]);
    await endConnection(conn);
    res.status(200).json(totalAffectedRows);
  } catch (error) {
    if (error) console.log(error);
    res.status(500).json(error.message);
  }
});

router.post(
  "/uploadGradeSheet",
  upload.single("uploadFile"),
  async (req, res) => {
    const uploadFile = req.file;
    const { class_code, method } = req.body;

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(uploadFile.path);

    const sheet = workbook.worksheets[0];

    const extractRowData = (row) => {
      return [
        row.values[1],
        row.values[4],
        row.values[5],
        row.getCell(6).result,
        row.getCell(7).result,
        row.values[8],
      ];
    };
    const conn = await startConnection();
    const processRow = async (rowData, finalRemark) => {
      try {
        const [rows, fields] = await conn.query(
          "UPDATE student_grades SET mid_grade = ?, final_grade = ?, grade = ?, remarks = ? WHERE student_grades_id = ?",
          [rowData[1], rowData[2], rowData[3], finalRemark, rowData[0]]
        );

        await conn.execute(
          "INSERT INTO grade_logs (student_grades_id, status) VALUES(?, ?)",
          [rowData[0], "NP"]
        );

        return rows.changedRows;
      } catch (err) {
        if (err) {
          console.error(err.message);
        }
      }
    };

    sheet.eachRow({ includeEmpty: true }, async (row, rowNumber) => {
      if (rowNumber > 5) {
        const rowData = extractRowData(row);
        let finalRemark = "";
        if (rowData[4]) finalRemark = rowData[4].toLowerCase();
        else {
          switch (rowData[5]) {
            case "Incomplete":
              finalRemark = "inc";
              break;
            case "Dropped":
              finalRemark = "drp";
              break;
            case "No Attendance":
              finalRemark = "na";
              break;
            case "Withdrawn":
              finalRemark = "w";
              break;
            default:
              break;
          }
        }
        try {
          await processRow(rowData, finalRemark);
        } catch (error) {
          res.status(500).send(error.message);
        }
      }
    });
    await conn.query("INSERT INTO updates(class_code, method) VALUES(?, ?)", [
      class_code,
      method,
    ]);
    await endConnection(conn);
    await fs.unlink(uploadFile.path);
    res.status(200).json(1);
  }
);
module.exports = router;
