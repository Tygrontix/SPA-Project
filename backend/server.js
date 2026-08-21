const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const logger = require('./logger');
const { createOperationOutcome } = require('./operationOutcome');
const { toFhirPatient } = require('./fhir/patient.mapper');
const app = express();

app.use(cors());
app.use(express.json());

const config = {
    user: "user_internship2024",
    password: "Internship2024",
    server: "datasrv",
    database: "internship2024",
    options: {
        trustServerCertificate: true,
        trustedConnection: false,
        enableArithAbort: true,
        instanceName: "sql2019",
    }
};

async function getPatientData(pool, id) {
    const patientResult = await pool
        .request()
        .input('id', sql.UniqueIdentifier, id)
        .query(`
            SELECT *
            FROM pacienti
            WHERE id = @id
        `);
    if (patientResult.recordset.length === 0) {
        return null;
    }

    const patient = patientResult.recordset[0];
    const telefoaneResult = await pool
        .request()
        .input('pacient_id', sql.UniqueIdentifier, id)
        .query(`
            SELECT *
            FROM pacient_telefoane
            WHERE pacient_id = @pacient_id
        `);
    const adreseResult = await pool
        .request()
        .input('pacient_id', sql.UniqueIdentifier, id)
        .query(`
            SELECT *
            FROM pacient_adrese
            WHERE pacient_id = @pacient_id
        `);

    return {
        ...patient,
        telefoane: telefoaneResult.recordset,
        adrese: adreseResult.recordset
    };
}

app.get('/',(req,res)=>{
    return res.json("backend message");
})

// Afisare lista apacienti

app.get('/fhir/Patient', async (req, res)=>{
    try {
        const pool = await sql.connect(config);
        const result = await pool   
            .request()
            .query(`
                SELECT * FROM pacienti
                ORDER BY data_inregistrare DESC
            `);
        const patients = result.recordset.map(toFhirPatient);
        const bundle = {
            resourceType: 'Bundle',
            type: 'searchset',
            total: patients.length,
            entry: patients.map(patient => ({
                resource: patient
            }))
        };
        res.json(bundle);
    }
    catch(err) {
        console.error('Eroare la obtinere pacientilor:', err);
        logger.error(err, 'Eroare la obtinerea pacientilor');
        res.status(500).json(
            createOperationOutcome(
                'error',
                'exception',
                'Eroare la obtinerea pacientilor.'
            )
        );
    }
});

// Afisare informatii pacient

app.get('/fhir/Patient/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const pool = await sql.connect(config);
        const patient = await getPatientData(pool, id);

        if (!patient) {
            return res.status(404).json(
                createOperationOutcome(
                    'error',
                    'not-found',
                    'Pacientul nu a fost gasit.'
                )
            );
        }
        res.json(
            toFhirPatient(patient)
        );
    }
    catch(err) {
        console.error('Eroare la obtinerea pacientului:', err);
        logger.error(err, 'Eroare la obtinerea pacientului');
        res.status(500).json(
            createOperationOutcome(
                'error',
                'exception',
                'Eroare la obtinerea pacientului.'
            )
        );
    }
});

// Afiseaza telefoane pacient

app.get('/fhir/Patient/:id/telefoane', async (req, res) => {
    try {
        const id = req.params.id;
        const pool = await sql.connect(config);
        const result = await pool
            .request()
            .input('pacient_id', sql.UniqueIdentifier, id)
            .query(`
                SELECT
                    id,
                    pacient_id,
                    eticheta,
                    numar
                FROM pacient_telefoane
                WHERE pacient_id = @pacient_id
            `);

        res.json(result.recordset);
    }
    catch(err) {
        console.error('Eroare la obtinerea telefoanelor:', err);
        logger.error(err, 'Eroare la obtinerea telefoanelor');
        res.status(500).json(
            createOperationOutcome(
                'error',
                'exception',
                'Eroare la obtinerea telefoanelor.'
            )
        );
    }
});

// Afisare adrese pacient

app.get('/fhir/Patient/:id/adrese', async (req, res) => {
    try {
        const id = req.params.id;
        const pool = await sql.connect(config);
        const result = await pool
            .request()
            .input('pacient_id', sql.UniqueIdentifier, id)
            .query(`
                SELECT
                    id,
                    pacient_id,
                    tip,
                    strada,
                    numar_strada,
                    bloc,
                    etaj,
                    apartament,
                    judet_sector,
                    oras,
                    aceeasi_ca_domiciliul
                FROM pacient_adrese
                WHERE pacient_id = @pacient_id
            `);
        res.json(result.recordset);
    }
    catch(err) {
        console.error('Eroare la obtinerea adreselor:', err);
        logger.error(err, 'Eroare la obtinerea adreselor');
        res.status(500).json(
            createOperationOutcome(
                'error',
                'exception',
                'Eroare la obtinerea adreselor.'
            )
        );
    }
});

// Creeaza pacient

app.post('/fhir/Patient', async (req, res) => {
    try {
        console.log('date:', req.body);
        const patient = req.body;
        if (patient.resourceType !== 'Patient') {
            return res.status(400).json(
                createOperationOutcome(
                    'error',
                    'invalid',
                    'Resource-ul trebuie sa fie de tip Patient.'
                )
            );
        }
        let nume = patient.name?.[0]?.family ?? '';
        let prenume = patient.name?.[0]?.given?.[0] ?? '';
        let initialeTata = patient.name?.[0]?.given?.[1] ?? '';
        const sex = patient.gender === 'male' ? 'M' : patient.gender === 'female' ? 'F' : patient.gender ?? null;

        if(!nume && !prenume) {
            nume = 'Popescu';
            if(sex === 'M') {
                prenume = 'Ion';
                initialeTata = 'XY';
            }
            else if(sex === 'F') {
                prenume = 'Ioana';
                initialeTata = 'XX';
            }
        }
        if((nume && !prenume) || (!nume && prenume)) {
            return res.status(400).json(
                createOperationOutcome(
                    'error',
                    'invalid',
                    'Numele si prenumele trebuie completate impreuna.'
                )
            );
        }
        
        const dataNasterii =patient.birthDate ?? null;
        const cnp = patient.identifier?.find(identifier => identifier.system === 'urn:cnp')?.value ?? null;
        const mentiuni = patient.note?.[0]?.text ?? null;
        const pool = await sql.connect(config);
        const result = await pool
            .request()
            .input('nume', sql.NVarChar, nume)
            .input('prenume', sql.NVarChar, prenume)
            .input('initiale_tata', sql.NVarChar, initialeTata)
            .input('data_nasterii', sql.Date, dataNasterii)
            .input('sex', sql.VarChar, sex)
            .input('cnp', sql.VarChar, cnp)
            .input('mentiuni', sql.VarChar, mentiuni)
            .query(`
                INSERT INTO pacienti (
                    id,
                    nume,
                    prenume,
                    initiale_tata,
                    data_nasterii,
                    sex,
                    cnp,
                    mentiuni
                )
                OUTPUT INSERTED.*
                VALUES (
                    NEWID(),
                    @nume,
                    @prenume,
                    @initiale_tata,
                    @data_nasterii,
                    @sex,
                    @cnp,
                    @mentiuni
                )
            `);
        
        const pacientId = result.recordset[0].id;
            if (patient.telecom?.length) {
                for (const telefon of patient.telecom) {
                    if (!telefon.value) {
                        continue;
                    }
                    await pool
                        .request()
                        .input('pacient_id', sql.UniqueIdentifier, pacientId)
                        .input('eticheta', sql.VarChar, telefon.use ?? 'personal')
                        .input('numar', sql.VarChar, telefon.value)
                        .query(`
                            INSERT INTO pacient_telefoane (
                                pacient_id,
                                eticheta,
                                numar
                            )
                            VALUES (
                                @pacient_id,
                                @eticheta,
                                @numar
                            )
                        `);
                }
            }

        if (patient.address?.length) {
            for (const adresa of patient.address) {
                const tip = adresa.use === 'home' ? 'domiciliu' : 'resedinta';
                const strada = adresa.line?.[0] ?? null;
                const numarStrada = adresa.line?.[1] ?? null;

                await pool
                    .request()
                    .input('pacient_id', sql.UniqueIdentifier, pacientId)
                    .input('tip', sql.VarChar, tip)
                    .input('strada', sql.NVarChar, strada)
                    .input('numar_strada', sql.VarChar, numarStrada)
                    .input('bloc', sql.VarChar, adresa.extension?.bloc ?? null)
                    .input('etaj', sql.VarChar, adresa.extension?.etaj ?? null)
                    .input('apartament', sql.VarChar, adresa.extension?.apartament ?? null)
                    .input('judet_sector', sql.NVarChar, adresa.district ?? null)
                    .input('oras', sql.NVarChar, adresa.city ?? null)
                    .input('aceeasi_ca_domiciliul', sql.Bit, adresa.aceeasiCaDomiciliul ?? false)
                    .query(`
                        INSERT INTO pacient_adrese (
                            pacient_id,
                            tip,
                            strada,
                            numar_strada,
                            bloc,
                            etaj,
                            apartament,
                            judet_sector,
                            oras,
                            aceeasi_ca_domiciliul
                        )
                        VALUES (
                            @pacient_id,
                            @tip,
                            @strada,
                            @numar_strada,
                            @bloc,
                            @etaj,
                            @apartament,
                            @judet_sector,
                            @oras,
                            @aceeasi_ca_domiciliul
                        )
                    `);
            }
        }

        const pacientComplet = await getPatientData(pool, pacientId);
        console.log('Pacient creat:', pacientComplet);
        res.status(201).json(
            toFhirPatient(pacientComplet)
        );
    }
    catch(err) {
        console.error('Eroare la crearea pacientului:', err);
        logger.error(err, 'Eroare la crearea pacientului');
        res.status(500).json(
            createOperationOutcome(
                'error',
                'exception',
                'Eroare la crearea pacientului.'
            )
        );
    }
});

// Actualizeaza datele pacientului

app.put('/fhir/Patient/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const patient = req.body;
        if (patient.resourceType !== 'Patient') {
            return res.status(400).json(
                createOperationOutcome(
                    'error',
                    'invalid',
                    'Resource-ul trebuie sa fie de tip Patient.'
                )
            );
        }
        const nume = patient.name?.[0]?.family ?? null;
        const prenume = patient.name?.[0]?.given?.[0] ?? null;
        const initialeTata = patient.name?.[0]?.given?.[1] ?? null;
        const dataNasterii = patient.birthDate ?? null;
        const cnp = patient.identifier?.find(identifier => identifier.system === 'urn:cnp')?.value ?? null;
        const activ = patient.active !== false;
        const sex = patient.gender === 'male' ? 'M' : patient.gender === 'female' ? 'F' : patient.gender ?? null;
        const pool = await sql.connect(config);
        const result = await pool
            .request()
            .input('id', sql.UniqueIdentifier, id)
            .input('nume', sql.NVarChar, nume)
            .input('prenume', sql.NVarChar, prenume)
            .input('initiale_tata', sql.NVarChar, initialeTata)
            .input('data_nasterii', sql.Date, dataNasterii)
            .input('sex', sql.VarChar, sex)
            .input('cnp', sql.VarChar, cnp)
            .input('activ', sql.Bit, activ)
            .query(`
                UPDATE pacienti
                SET
                    nume = @nume,
                    prenume = @prenume,
                    initiale_tata = @initiale_tata,
                    data_nasterii = @data_nasterii,
                    sex = @sex,
                    cnp = @cnp,
                    activ = @activ,
                    data_actualizare = SYSDATETIME()
                OUTPUT INSERTED.*
                WHERE id = @id
            `);
        if(result.recordset.length === 0) {
            return res.status(404).json(
                createOperationOutcome(
                    'error',
                    'not-found',
                    'Pacientul nu a fost gasit.'
                )
            );
        }
        res.json(
            toFhirPatient(result.recordset[0])
        );
    }
    catch(err) {
        console.error('Eroare la actualizarea pacientului:', err);
        logger.error(err, 'Eroare la actualizarea pacientului');
        res.status(500).json(
            createOperationOutcome(
                'error',
                'exception',
                'Eroare la actualizarea pacientului.'
            )
        );
    }
});

// Stergere pacient

app.delete('/fhir/Patient/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const pool = await sql.connect(config);
        const result = await pool
            .request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`
                DELETE FROM pacienti
                WHERE id = @id    
            `);
        if(result.rowsAffected[0] === 0) {
            return res.status(404).json(
                createOperationOutcome(
                    'error',
                    'not-found',
                    'Pacientul nu a fost gasit.'
                )
            );
        }
        res.status(204).send();
    }
    catch(err) {
        console.error('Stergere esuata, eroare:', err);
        logger.error(err, 'Stergere esuata');
        res.status(500).json(
            createOperationOutcome(
                'error',
                'exception',
                'Stergere esuata.'
            )
        );
    }
});

// Server starter

app.listen(3000, () => {
    console.log("The server has started");
});