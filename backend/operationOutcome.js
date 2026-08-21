function createOperationOutcome(
    severity,
    code,
    message
) {
    return {
        resourceType: 'OperationOutcome',
        issue: [
            {
                severity,
                code,
                details: {
                    text: message
                }
            }
        ]
    }
}
module.exports = {
    createOperationOutcome
};