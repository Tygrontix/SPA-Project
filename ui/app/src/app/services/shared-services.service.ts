import { Injectable, signal } from '@angular/core';
import { Patient, DALService } from './dal.service';
import { PatientService } from './patient.service';

interface Notif {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
    removing?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class SharedServicesService {
    selectedPatientId = signal<string | null>(null);
    mode = signal<'view' | 'create' | 'edit'>('view');
    patientCreated = signal<Patient | null>(null);
    patientDeleted = signal<string | null>(null);
    patientUpdated = signal<Patient | null>(null);
    notifications = signal<Notif[]>([]);

    constructor(
        private dal: DALService,
        public patientService: PatientService
    ) {}

    private notificareId = 0;

    startCreate(): void {
        this.selectedPatientId.set(null);
        this.mode.set('create');
    }

    selectPatient(id: string): void {
        this.selectedPatientId.set(id);
        this.mode.set('view');
    }

    startEdit(): void {
        this.mode.set('edit');
    }

    deletePatient(patient: Patient): void {
        if(!patient.id) {
            return;
        }
        const patientId = patient.id;
        const nume = this.patientService.getNume(patient);
        const prenume = this.patientService.getPrenume(patient);
        const confirmed = confirm(
            `Confirmi stergerea pacientului ${nume} ${prenume}?`
        );

        if(!confirmed) {
            console.log('Stergere anulata.');
            return;
        }
        this.dal.deletePatient(patient.id).subscribe({
            next: () => {
                console.log(`Pacient sters: ${nume} ${prenume} - ID: ${patient.id}`);
                this.patientDeleted.set(patientId);
                if(this.selectedPatientId() === patient.id) {
                    this.selectedPatientId.set(null);
                    this.mode.set('view');
                };
                this.showNotification(
                    `Pacient sters: ${nume} ${prenume} - ID: ${patient.id}.`,
                     'success'
                );
            },
            error: (error) => {
                console.error('Stergere esuata: ', error);
                this.showNotification(
                    'Stergere esuata.',
                    'error'
                );
            }
        });
    }

    createdPatient(patient: Patient): void {
        if(!patient.id) {
            return;
        }
        this.patientCreated.set(patient);
        this.selectedPatientId.set(patient.id);
        this.mode.set('view');
    }

    updatedPatient(patient: Patient): void {
        this.patientUpdated.set(patient);
    }

    // Notificari

    showNotification(
        message: string,
        type: 'success' | 'error' | 'info'
    ):void {
        const notificare: Notif = {
            id: this.notificareId++,
            message: message,
            type: type
        };

        this.notifications.update(notifications => [
            notificare,
            ...notifications
        ]);

        setTimeout(() => {
            this.notifications.update(notifications =>
                notifications.map(n =>
                    n.id === notificare.id ? { ...n, removing: true } : n
                )
            );
            setTimeout(() => {
                this.removeNotification(notificare.id);
            }, 600);

        }, 5000);
    }

    removeNotification(id: number): void {
        this.notifications.update(notifications =>
            notifications.filter(
                notificare => notificare.id !== id
            )
        );
    }

    trackByNotificationId(
        id: number, 
        notificare: Notif): number {
            return notificare.id;
    }

}