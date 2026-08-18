import { Injectable, signal } from '@angular/core';
import { Patient } from './database.service';

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
    notifications = signal<Notif[]>([]);

    private notificareId = 0;

    startCreate(): void {
        this.mode.set('create');
        this.selectedPatientId.set(null);
    }

    selectPatient(id: string): void {
        this.selectedPatientId.set(id);
        this.mode.set('view');
    }

    startEdit(): void {
        this.mode.set('edit');
    }

    deletePatient(id: string): void {
        if(this.selectedPatientId() === id) {
            this.selectedPatientId.set(null);
            this.mode.set('view');
        }
        this.patientDeleted.set(id);
    }

    createdPatient(patient: Patient): void {
        this.patientCreated.set(patient);
        this.selectedPatientId.set(patient.id);
        this.mode.set('view');
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