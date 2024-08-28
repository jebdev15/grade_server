const getSingleSetOfData = async (conn, tableName, column, param) => { 
    try {
        const [rows] = await conn.query(`SELECT * FROM ${tableName} WHERE ${column}`,[param]);
        return rows
    } catch(err) {
        console.log(err.message);
        return []
    }
}

module.exports = {
    getSingleSetOfData
}