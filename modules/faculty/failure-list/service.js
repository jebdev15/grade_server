/**
 * Faculty Service
 * Faculty-only business logic for roster and submission
 */

const { service, repository } = require("@shared/failure-list");

const getRoster = async (conn, classCode, termType) => {
  return service.getFailureListRoster(conn, classCode, termType);
};

const submitList = async (conn, classCode, termType, selectedStudents) => {
  const policy = await service.getFailureListPolicy(conn, classCode, termType);

  if (!policy.isApplicable) {
    throw new Error("List of Failures is not applicable for this class.");
  }

  if (!policy.window) {
    throw new Error("List of Failures submission window has not been opened.");
  }

  if (!policy.isWindowOpen) {
    throw new Error("List of Failures submission window is closed.");
  }

  await conn.beginTransaction();

  try {
    const failureListId = await repository.saveList(
      conn,
      policy.classInfo,
      termType,
      selectedStudents,
      "submitted"
    );

    if (policy.postDeadlineAction === "auto_pass") {
      await service.applyAutoPassForNonListed(
        conn,
        policy.classInfo,
        termType,
        selectedStudents
      );
    }

    await conn.commit();
    return failureListId;
  } catch (error) {
    await conn.rollback();
    throw error;
  }
};

module.exports = {
  getRoster,
  submitList,
};
