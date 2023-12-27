const express = require("express");
const router = express.Router();
const { startConnection, endConnection } = require("../config/conn");

router.get("/login", async (req, res) => {
  const { studentID, password } = req.query;
  const conn = await startConnection();
  const [row] = await conn.query(
    "SELECT * FROM student WHERE student_id = ? LIMIT 1",
    [studentID]
  );

  if (row.length) {
    //If student_id exists
    const studentInfo = row[0];
    const [loginRow] = await conn.query(
      "SELECT * FROM login WHERE student_id = ? LIMIT 1",
      [studentID]
    );
    if (loginRow.length) {
      //If student has previously logged in
      const loginData = loginRow[0];
      if (password === loginData.password)
        res.status(200).json({ code: "STUDENTFOUND", data: studentInfo });
      else res.status(401).json({ code: "WRONGPASS", data: "Wrong Password!" });
    } else {
      //If student has not tried logging in
      const defaultPassword = "chmsu2023";
      if (password === defaultPassword) {
        await conn.execute(
          "INSERT INTO login(student_id, password) VALUES(?,?)",
          [studentID, password]
        );
        res.status(200).json({ code: "STUDENTFOUND", data: studentInfo });
      } else
        res.status(401).json({ code: "WRONGPASS", data: "Wrong Password!" });
    }
  } else
    res
      .status(404)
      .json({ code: "STUDENTNOTFOUND", data: "No matching student ID." });
  await endConnection(conn);
});
router.get("/getGrades", async (req, res) => {
  const { studentID } = req.query;
  const conn = await startConnection();
  const [gradeRows] = await conn.query(
    "SELECT * FROM student_grades WHERE student_id = ?",
    [studentID]
  );
  res.status(200).json({ code: "GRADEFETCH", data: gradeRows });

  await endConnection(conn);
});
module.exports = router;
