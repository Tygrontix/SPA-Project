import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { DatabaseService, Patient } from '../services/database.service';
import { SharedServicesService } from '../services/shared-services.service';

@Component({
    standalone: true,
    selector: 'app-lista-pacienti',
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './lista-pacienti.component.html',
    styleUrl: './lista-pacienti.component.css',
})

export class ListaPacientiComponent implements OnInit {
    patients = signal<Patient[]>([]);

    constructor(
        private database: DatabaseService,
        public shared: SharedServicesService
    ) {
        effect(() => {
            const patient = this.shared.patientCreated();

            if(!patient) {
                return;
            }
            this.patients.update(patients => [
                patient,
                ...patients.filter(p => p.id !== patient.id)
            ]);
        });
    }

    // Afiseaza pacientii din DB in tabel

    ngOnInit(): void {
        this.database.getPatients().subscribe(data => {
            console.log('Pacienti:', data);

            this.patients.set(data);
        });
    }

    // Calculeaza varsta pacientului in functie de data nasterii

    getAge(dataN: string): string {

        const dataNastere = new Date(dataN);
        const dataActuala = new Date();
        const aniLuni: string[] = [];

        let ani = dataActuala.getFullYear() - dataNastere.getFullYear();
        let luni = dataActuala.getMonth() - dataNastere.getMonth();

        if (dataActuala.getDate() < dataNastere.getDate()) {
            luni--;
        }
        if (luni < 0) {
            ani--;
            luni += 12;
        }
        if (ani > 0) {
            aniLuni.push(
                ani === 1 ? '1 an' : `${ani} ani`
            );
        }
        if (luni > 0) {
            aniLuni.push(
                luni === 1 ? '1 luna' : `${luni} luni`
            );
        }
        if (ani === 0 && luni === 0) {
            return '0 luni';
        }
        return aniLuni.join(' ');
    }

    // Pagini lista

    pageSize = 10;
    currentPage = 1;

    get pageLength(): number {
        return this.patients().length;
    }

    get totalPages(): number {
        return Math.ceil(this.patients().length / this.pageSize);
    }

    get paginatedPatients(): Patient[] {

        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;

        return this.patients().slice(start, end);
    }

    changePage(page: number | string): void {
        if (typeof page !== 'number') {
            return;
        }

        if (page < 1 || page > this.totalPages) {
            return;
        }

        this.currentPage = page;
    }

    changePageSize(size: number): void {
        this.pageSize = size;
        this.currentPage = 1;
    }

    getPages(): (number | string)[] {
        const total = this.totalPages;

        if (total === 0) {
            return [];
        }

        if (total <= 5) {
            return Array.from(
                { length: total },
                (_, i) => i + 1
            );
        }

        if (this.currentPage <= 3) {
            return [
                1,
                2,
                3,
                4,
                '...',
                total
            ];
        }

        if (this.currentPage >= total - 2) {
            return [
                1,
                '...',
                total - 3,
                total - 2,
                total - 1,
                total
            ];
        }


        return [
            1,
            '...',
            this.currentPage - 1,
            this.currentPage,
            this.currentPage + 1,
            '...',
            total
        ];
    }

    // Selecteaza un pacient din lista

    selectPatient(patient: Patient): void {
        this.shared.selectPatient(patient.id);
    }

    // Adauga pacientul nou in cap de tabel 

    addCreatedPatient(patient: Patient): void {
    this.patients.update(patients => [
        patient,
        ...patients
    ]);
}

    // Butoane pacienti

    editPatient(patient: Patient): void {
    console.log('EDIT CLICKED', patient);

    this.shared.selectPatient(patient.id);
    this.shared.startEdit();

    console.log('ID:', this.shared.selectedPatientId());
    console.log('MODE:', this.shared.mode());
}

    deletePatient(patient: Patient): void {
        const confirmed = confirm(
            `Confirmi stergerea pacientului ${patient.nume} ${patient.prenume}?`
        );

        if(!confirmed) {
            console.log('Stergere anulata');
            this.shared.showNotification(
                'Stergerea a fost anulata.',
                'info'
            );
            return;
        }

        this.database.deletePatient(patient.id).subscribe({
            next: () => {
                console.log(`Pacient sters: ${patient.nume} ${patient.prenume} - ID: ${patient.id}`);
                this.shared.showNotification(
                    `Pacient sters: ${patient.nume} ${patient.prenume} - ID: ${patient.id}.`,
                     'success'
                );
                this.patients.update(patients => 
                    patients.filter(p => p.id !== patient.id)
                );
                this.shared.selectedPatientId.set(null);
                this.shared.mode.set('view');
                if(this.currentPage > this.totalPages && this.totalPages > 0) {
                    this.currentPage = this.totalPages;
                }
                this.shared.deletePatient(patient.id);
            },
            error: (error) => {
                console.error('Stergere esuata: ', error);
                this.shared.showNotification(
                    'Stergere esuata.',
                    'error'
                );
            }
        });
    }

    addPatient(): void { // trebuie dezvoltat si implementat 
        this.shared.mode.set('create');
        this.shared.startCreate();
    }

}