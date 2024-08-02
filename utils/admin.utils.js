const getEmailsAllowedAccessLevels = (accessLevel) => ["Administrator", "Registrar"].includes(accessLevel)

module.exports = {
    getEmailsAllowedAccessLevels,
}