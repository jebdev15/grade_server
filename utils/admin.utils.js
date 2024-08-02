const getEmailsAllowedAccessLevels = (accessLevel) => ["Administrator", "Registrar"].includes(accessLevel)

const getStudentsAllowedAccessLevels = (accessLevel) => ["Administrator", "Registrar"].includes(accessLevel)
module.exports = {
    getEmailsAllowedAccessLevels,
    getStudentsAllowedAccessLevels
}