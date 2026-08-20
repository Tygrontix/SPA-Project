const express = require('express');
const sql = require('mssql');
const cors = require('cors');

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
                SELECT * FROM lista_pacienti
                ORDER BY data_inregistrare DESC
            `);

        res.json(result.recordset);
    }
    catch (err) {
        console.error('Eroare la obtinere pacientilor:', err);
        res.status(500).json({
            error: 'Eroare la obtinerea pacientilor.'
        });
    }
});

// Afisare informatii pacient

app.get('/fhir/Patient/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const pool = await sql.connect(config);
        const result = await pool
            .request().
            input('id', sql.UniqueIdentifier, id)
            .query(`
                SELECT * FROM lista_pacienti
                WHERE id = @id
            `);
        if(result.recordset.length === 0) {
            return res.status(404).json({
                error: 'Pacientul nu a fost gasit.'
            });
        }
        res.json(result.recordset[0]);
    }
    catch (err) {
        console.error('Eroare la obtinerea pacientului:', err);
        res.status(500).json({
            error: 'Eroare la obtinerea pacientului.'
        });
    }
});

// Creeaza pacient

app.post('/fhir/Patient', async (req, res) => {
    try {

        console.log('date:', req.body);
        const {nume, prenume, data_nasterii, sex, cnp} = req.body;
        const pool = await sql.connect(config);
        const result = await pool
            .request()
            .input('nume', sql.NVarChar, nume)
            .input('prenume', sql.NVarChar, prenume)
            .input('data_nasterii', sql.Date, data_nasterii)
            .input('sex', sql.Bit, sex)
            .input('cnp', sql.VarChar, cnp)
            .query(`
                INSERT INTO lista_pacienti
                    (id, nume, prenume, data_nasterii, sex, cnp)
                OUTPUT INSERTED.*
                VALUES
                    (NEWID(), @nume, @prenume, @data_nasterii, @sex, @cnp)
            `);
        
        console.log('Pacient creat:', result.recordset[0]); // temp
        res.status(201).json(result.recordset[0]);
    }
    catch (err) {
        console.error('Eroare la crearea pacientului:', err);

        res.status(500).json({
            error: 'Eroare la crearea pacientului.'
        });
    }
});

// Actualizeaza datele pacientului

app.put('/fhir/Patient/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const {
            nume,
            prenume,
            data_nasterii,
            sex,
            cnp
        } = req.body;
        const pool = await sql.connect(config);
        const result = await pool
            .request()
            .input('id', sql.UniqueIdentifier, id)
            .input('nume', sql.NVarChar, nume)
            .input('prenume', sql.NVarChar, prenume)
            .input('data_nasterii', sql.Date, data_nasterii)
            .input('sex', sql.Bit, sex)
            .input('cnp', sql.VarChar, cnp)
            .query(`
                UPDATE lista_pacienti
                SET
                    nume = @nume,
                    prenume = @prenume,
                    data_nasterii = @data_nasterii,
                    sex = @sex,
                    cnp = @cnp
                OUTPUT INSERTED.*
                WHERE id = @id
            `);
        if(result.recordset.length === 0)
            return res.status(404).json({
                error: 'Pacientul nu a fost gasit.'
        });
        res.json(result.recordset[0]);
    }
    catch (err) {
        console.error('Eroare la actualizarea pacientului:', err);
        res.status(500).json({
            error: 'Eroare la actualizarea pacientului.'
        });
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
                DELETE FROM lista_pacienti
                WHERE id = @id    
            `);
        
        if(result.rowsAffected[0] === 0) {
            return res.status(404).json({
                error: 'Pacientul nu a fost gasit.'
            });
        }

        res.json({
            message: 'Pacientul a fost sters cu succes.'
        });
    }
    catch (err) {
        console.error('Stergere esuata, eroare:', err);

        res.status(500).json({
            error: 'Stergere esuata.'
        });
    }
});

// Server starter

app.listen(3000, () => {
    console.log("The server has started");
});
