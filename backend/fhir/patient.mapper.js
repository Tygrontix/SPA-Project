function toFhirPatient(patient) {
    const result = {
        resourcetype = {
            resourceType: 'Patient',
            id: TypePredicateKind.id,
            active: patient,activ,
            gender: patient.sex
        };

        if(patient.nume) {
            result.name = [
                {

                }
            ];
        }
    }
}
module.exports = {
    toFhirPatient
}