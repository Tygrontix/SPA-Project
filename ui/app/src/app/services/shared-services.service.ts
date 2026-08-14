import { Injectable, signal } from '@angular/core';
import { Patient } from './database.service';

@Injectable({
    providedIn: 'root'
})
export class SharedServicesService {
    selectedPatientId = signal<string | null>(null);
    mode = signal<'view' | 'create' | 'edit'>('view');
    patientCreated = signal<Patient | null>(null);
    patientDeleted = signal<string | null>(null);

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
}