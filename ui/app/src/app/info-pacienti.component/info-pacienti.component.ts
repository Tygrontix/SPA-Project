import { Component, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DALService, Patient } from '../services/dal.service';
import { SharedServicesService } from '../services/shared-services.service';
import { PatientService } from '../services/patient.service';

@Component({
    standalone: true,
    selector: 'app-info-pacienti',
    imports: [FormsModule],
    templateUrl: './info-pacienti.component.html',
    styleUrl: './info-pacienti.component.css',
})

export class InfoPacientiComponent {
    patient = signal<Patient | null>(null);
    loadingPatient = signal(false);
    formPatient = signal({
        family: '',
        given: '',
        initialeTata: '',
        birthDate: '',
        gender: 'unknown' as 'male' | 'female' | 'other' | 'unknown',
        cnp: ''
    });

    constructor(
        private dal: DALService,
        public shared: SharedServicesService,
        public patientService: PatientService
    ) {
        effect(() => {
            const id = this.shared.selectedPatientId();

            if(!id) {
                this.loadingPatient.set(false);
                this.patient.set(null);
                this.clearForms();
                return;
            }
            this.loadingPatient.set(true);
            this.dal.getPatient(id).subscribe({
                next: (data) => {
                    console.log('Pacient primit:', data);
                    this.patient.set(data);
                    this.formPatient.set(
                        this.patientToForm(data)
                    );
                    this.loadingPatient.set(false);
                },
                error: (error) => {
                    console.error('Eroare la obtinerea pacientului:', error);
                    this.patient.set(null);
                    this.loadingPatient.set(false);
                }
            });
        });
    }

    patientToForm(patient: Patient) {
        return {
            family: this.patientService.getNume(patient),
            given: this.patientService.getPrenume(patient),
            initialeTata: this.patientService.getInitialeTata(patient),
            birthDate: patient.birthDate ? patient.birthDate.split('T')[0] : '',
            gender: patient.gender ?? 'unknown',
            cnp: this.patientService.getCNP(patient)
        };
    }

    formToPatient(
        form: ReturnType<InfoPacientiComponent['getFormValue']>,
        existingPatient?: Patient
    ): Patient {
        const given: string[] = [];

        if(form.given) {
            given.push(form.given);
            if(form.initialeTata) {
                given.push(form.initialeTata);
            }
        }
        return {
            resourceType: 'Patient',
            id: existingPatient?.id,
            active: existingPatient?.active ?? true,
            gender: form.gender,
            birthDate: form.birthDate || undefined,
            name: [
                {
                    family: form.family || undefined,
                    given: [
                        ...(form.given ? [form.given] : []),
                        ...(form.initialeTata ? [form.initialeTata] : [])
                    ]
                }
            ],
            identifier: form.cnp ? [{
                system: 'urn:cnp', 
                value: form.cnp
            }] : undefined,
            telecom: existingPatient?.telecom,
            address: existingPatient?.address,
            note: existingPatient?.note
        };
    }

    getFormValue() {
        return this.formPatient();
    }

    clearForms(): void {
        this.formPatient.set({
            family: '',
            given: '',
            initialeTata: '',
            birthDate: '',
            gender: 'unknown',
            cnp: ''
        });
    }

    startEdit(): void {
        if(!this.patient()) {
            return;
        }
        this.shared.mode.set('edit');
    }

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
        this.formPatient.set(
            this.patientToForm(patient)
        );
        this.shared.mode.set('view');
    }

    savePatient(): void {
        const form = this.getFormValue();

        if(this.shared.mode() === 'create') {
            const newPatient = this.formToPatient(form);

            this.dal.setPatient(newPatient).subscribe({
                next: (savedPatient) => {
                    console.log('Patient creat:', savedPatient);
                    this.patient.set(savedPatient);
                    this.shared.createdPatient(savedPatient);
                    this.formPatient.set(
                        this.patientToForm(savedPatient)
                    );
                    this.shared.mode.set('view');

                    const nume = this.patientService.getNume(savedPatient);
                    const prenume = this.patientService.getPrenume(savedPatient);

                    this.shared.showNotification(`Pacient nou creat: ${nume} ${prenume} - ID: ${savedPatient.id}`, 'success');
                },
                error: (err) => {
                    console.error('Eroare la crearea pacientului:', err);
                    this.shared.showNotification('Eroare la crearea pacientului.', 'error');
                }
            });
            return;
        }
        if(this.shared.mode() === 'edit') {
            const currentPatient = this.patient();

            if (!currentPatient) {
                return;
            }

            const updatedPatient = this.formToPatient(form, currentPatient);

            this.dal.setPatient(updatedPatient).subscribe({
                next: (savedPatient) => {
                    console.log('Schimbarile au fost salvate:', savedPatient);
                    this.shared.updatedPatient(savedPatient);
                    this.patient.set(savedPatient);
                    this.formPatient.set(this.patientToForm(savedPatient));
                    this.shared.mode.set('view');
                    this.shared.showNotification('Schimbarile au fost salvate.', 'success');
                },
                error: (error) => {
                    console.error('Eroare la actualizarea pacientului:', error);
                    this.shared.showNotification('Eroare la actualizarea pacientului.', 'error');
                }
            });
        }
    }
}