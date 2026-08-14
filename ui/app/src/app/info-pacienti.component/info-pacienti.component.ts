import { Component, effect, input, signal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatabaseService, Patient, NewPatient } from '../services/database.service';
import { SharedServicesService } from '../services/shared-services.service';


@Component({
    standalone: true,
    selector: 'app-info-pacienti',
    imports: [FormsModule],
    templateUrl: './info-pacienti.component.html',
    styleUrl: './info-pacienti.component.css',
})
export class InfoPacientiComponent {
    patient = signal<Patient | null>(null);

    formPatient = signal({
        nume: '',
        prenume: '',
        data_nasterii: '',
        sex: false,
        cnp: ''
    });

    // Formateaza data

    private formatDate(date: string): string {
        return date.split('T')[0];
    }

    constructor(
        private database: DatabaseService,
        public shared: SharedServicesService

    ) {
        effect(() => {
            const id = this.shared.selectedPatientId();

            if (!id) {
                this.patient.set(null);
                this.shared.mode.set('view');

                this.formPatient.set({
                    nume: '',
                    prenume: '',
                    data_nasterii: '',
                    sex: false,
                    cnp: ''
                });
                return;
                
            }

            this.database.getPatient(id).subscribe({
                next: (data) => {
                    this.patient.set(data);
                    this.formPatient.set({
                        nume: data.nume,
                        prenume: data.prenume,
                        data_nasterii: this.formatDate(data.data_nasterii),
                        sex: data.sex,
                        cnp: data.cnp
                    });
                },
                error: (error) => {
                    console.error(
                        'Eroare la obtinerea pacientului:',
                        error
                    );
                    this.patient.set(null);
                }
            });
        });
    }

    // Goleste form

    clearForms(): void {
        this.formPatient.set({
            nume: '',
            prenume: '',
            data_nasterii: '',
            sex: false,
            cnp: ''
        });
    }

    // Creaza form pt pacient

    startCreate(): void {
        this.patient.set(null);
        this.clearForms();
        this.shared.mode.set('create');
    }

    // Edit form pacient

    startEdit(): void {
        if(!this.patient()) {
            return;
        }
        this.shared.mode.set('edit');
    };

    // Cancel edit form

    cancelEdit(): void {
        const patient = this.patient();

        if(this.shared.mode() === 'create') {
            this.clearForms();
            this.patient.set(null);
            this.shared.mode.set('view');
            return;
        }
        if (!patient) {
            return;
        }
        this.formPatient.set({
            nume: patient.nume,
            prenume: patient.prenume,
            data_nasterii: this.formatDate(patient.data_nasterii),
            sex: patient.sex,
            cnp: patient.cnp
        });
        this.shared.mode.set('view');
    }
    
    // Salveaza schimbari 

    savePatient(): void { // trebuie schimbat
        const form = this.formPatient();

        if(this.shared.mode() === 'create') {
            const newPatient: NewPatient = {
                nume: form.nume,
                prenume: form.prenume,
                data_nasterii: form.data_nasterii,
                sex: form.sex,
                cnp: form.cnp
            };
            this.database.setPatient(newPatient).subscribe({
                next: (savedPatient) => {
                    this.patient.set(savedPatient);
                    this.shared.createdPatient(savedPatient);
                    this.formPatient.set({
                        nume: savedPatient.nume,
                        prenume: savedPatient.prenume,
                        data_nasterii: this.formatDate(savedPatient.data_nasterii),
                        sex: savedPatient.sex,
                        cnp: savedPatient.cnp
                    });
                    this.shared.mode.set('view');
                    console.log('Pacient creat:', savedPatient);
                },
                error: (err) => {
                    console.error('Eroare la crearea oacientului:', err);
                }
            });
            return;
        }

        if(this.shared.mode() === 'edit') {
            const currentPatient = this.patient();
            if(!currentPatient) {
                return;
            }
            const updatedPatient: Patient = {
                id: currentPatient.id,
                nume: form.nume,
                prenume: form.prenume,
                data_nasterii: form.data_nasterii,
                sex: form.sex,
                cnp: form.cnp
            };
            this.database.setPatient(updatedPatient).subscribe({
                next:(savedPatient) => {
                    this.patient.set(savedPatient);
                    this.formPatient.set({
                        nume: savedPatient.nume,
                        prenume: savedPatient.prenume,
                        data_nasterii: this.formatDate(savedPatient.data_nasterii),
                        sex: savedPatient.sex,
                        cnp: savedPatient.cnp
                    });
                    this.shared.mode.set('view');
                    console.log('Schimbarile au fost salvate.');
                }
            });
        }
    }
}
