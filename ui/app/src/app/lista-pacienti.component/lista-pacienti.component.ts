import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import QRCode from 'qrcode';
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
            const createdPatient = this.shared.patientCreated();

            if(!createdPatient) {
                return;
            }
            this.patients.update(patients => [
                createdPatient,
                ...patients.filter(p => p.id !== createdPatient.id)
            ]);
        });

        effect(() => {
            const updatedPatient = this.shared.patientUpdated();

            if(!updatedPatient) {
                return;
            }
            this.patients.update(patients => 
                patients.map(p => p.id === updatedPatient.id ? updatedPatient : p)
            );
        });

        effect(() => {
            const deletedPatient = this.shared.patientDeleted();

            if(!deletedPatient) {
                return;
            }
            this.patients.update(patients =>
                patients.filter(p => p.id !== deletedPatient)
            );
            if(this.currentPage > this.totalPages && this.totalPages > 0) {
                this.currentPage = this.totalPages;
            }
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

    // Pacienti

    selectPatient(patient: Patient): void {
        this.shared.selectPatient(patient.id);
    }

    addCreatedPatient(patient: Patient): void {
        this.patients.update(patients => [
            patient,
            ...patients
        ]);
        console.log('Pacientul a fost adaugat.')
    }

    // Butoane pacienti

    editPatient(patient: Patient): void {
        this.shared.selectPatient(patient.id);
        this.shared.startEdit();
    }

    deletePatient(patient: Patient): void {
        this.shared.deletePatient(patient);
    }

    linkQR: string ='';
    imageQR: string ='';
    showQR: boolean = false;
    numeQR: string = '';

    async generateQR(patient: Patient): Promise<void> {
        const cifreCNP: string = patient.cnp.slice(7, 12);
        const sex: string = patient.sex ? 'Masculin' : 'Feminin';
        this.linkQR = `https://example.com/${patient.id}|${cifreCNP}|${sex}`;
        this.numeQR = `${patient.nume} ${patient.prenume}`;
        this.imageQR = await QRCode.toDataURL(this.linkQR, {
            width: 256,
            errorCorrectionLevel: 'M'
        });
        this.showQR = true;
        console.log(`Cod QR generat - ${patient.id}`)
    }

    closePopupQR(): void {
        this.showQR = false;
    }

    addPatient(): void { 
        this.shared.startCreate();
    }

}