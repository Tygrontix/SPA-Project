function toFhirPatient(patient) {
    const result = {
        resourceType: 'Patient',
        id: patient.id,
        active: patient.activ,
        gender: patient.sex === 'M' ? 'male' : patient.sex === 'F' ? 'female' : 'unknown'
    };
    if(patient.nume || patient.prenume || patient.initiale_tata) {
        result.name = [
            {
                family: patient.nume || undefined,
                given: []
            }
        ];
        if(patient.prenume) {
            result.name[0].given.push(patient.prenume);
        }
        if(patient.initiale_tata) {result.name[0].given.push(patient.initiale_tata);
        }
    }
    if(patient.data_nasterii) {
        result.birthDate = patient.data_nasterii.toISOString().split('T')[0];
    }
    if(patient.cnp) {
        result.identifier = [
            {
                system: 'urn:cnp',
                value: patient.cnp
            }
        ];
    }
    if(patient.mentiuni) {
        result.note = [
            {
                text: patient.mentiuni
            }
        ];
    }
    return result;
}

module.exports = {
    toFhirPatient
};