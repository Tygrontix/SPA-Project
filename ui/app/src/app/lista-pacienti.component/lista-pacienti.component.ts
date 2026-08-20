import { Component, OnInit, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import QRCode from 'qrcode';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { DatabaseService, Patient } from '../services/database.service';
import { SharedServicesService } from '../services/shared-services.service';

type ColSort = 'nume' | 'prenume' | 'varsta' | 'sex';

interface CriteriuSortareInterface {
    coloana: ColSort;
    directie: 'asc' | 'desc';
}

@Component({
    standalone: true,
    selector: 'app-lista-pacienti',
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './lista-pacienti.component.html',
    styleUrl: './lista-pacienti.component.css',
})

export class ListaPacientiComponent implements OnInit {
    criteriuSortare = signal<CriteriuSortareInterface[]>([]);
    patients = signal<Patient[]>([]);
    defaultSort = signal<Patient[]>([]);

    constructor(
        private database: DatabaseService,
        public shared: SharedServicesService
    ) {
        effect(() => {
            const createdPatient = this.shared.patientCreated();

            if(!createdPatient) {
                return;
            }
            this.defaultSort.update(patients => [
                createdPatient,
                ...patients.filter(p => p.id !== createdPatient.id)
            ]);
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
            this.defaultSort.update(patients =>
                patients.filter(p => p.id !== deletedPatient)
            );
            
            if(this.currentPage() > this.totalPages && this.totalPages > 0) {
                this.currentPage.set(this.totalPages);
            }
        });
    }

    // Afiseaza pacientii din DB in tabel

    ngOnInit(): void {
        this.database.getPatients().subscribe(data => {
            console.log('Pacienti:', data);
            this.defaultSort.set(data);
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

    getAgeInMonths(dataN: string): number {
        const dataNastere = new Date(dataN);
        const dataActuala = new Date();
        let ani = dataActuala.getFullYear() - dataNastere.getFullYear();
        let luni = dataActuala.getMonth() - dataNastere.getMonth();

        if(dataActuala.getDate() < dataNastere.getDate()) {
            luni--;
        }
        if(luni < 0) {
            ani--;
            luni += 12;
        }
        return ani * 12 + luni;
    }

    // Pagini lista

    pageSize = signal(10);
    currentPage = signal(1);

    get pageLength(): number {
        return this.patients().length;
    }

    get totalPages(): number {
        return Math.ceil(this.patients().length / this.pageSize());
    }

    paginatedPatients = computed(() => {
        const patients = this.patients();
        const pageSize = this.pageSize();
        const currentPage = this.currentPage();
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;

        return patients.slice(start, end);
    });

    changePage(page: number | string): void {
        if (typeof page !== 'number') {
            return;
        }

        if (page < 1 || page > this.totalPages) {
            return;
        }

        this.currentPage.set(page);
    }

    changePageSize(size: number): void {
        this.pageSize.set(size);
        this.currentPage.set(1);
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

        if (this.currentPage() <= 3) {
            return [
                1,
                2,
                3,
                4,
                '...',
                total
            ];
        }

        if (this.currentPage() >= total - 2) {
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
            this.currentPage() - 1,
            this.currentPage(),
            this.currentPage() + 1,
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

    // Sortare

    sortBy(coloana: ColSort): void {
        this.criteriuSortare.update(criteriu => {
            const index = criteriu.findIndex(c => c.coloana === coloana);
            let criteriiNoi: CriteriuSortareInterface[];

            if(index === -1) {
                criteriiNoi = [
                    ...criteriu,{coloana: coloana, directie: 'asc'}
                ];
            }
            else if(criteriu[index].directie === 'asc') {
                criteriiNoi = [...criteriu];
                criteriiNoi[index] = {
                    ...criteriu[index],
                    directie: 'desc'
                };
            }
            else {
                criteriiNoi = criteriu.filter(criteriu => criteriu.coloana !== coloana);
            }
            if(criteriiNoi.length === 0) {
                this.patients.set(this.defaultSort());
            }
            else {
                this.sorteazaPacienti(criteriiNoi);
            }

            return criteriiNoi;
        });
    }

    sorteazaPacienti(criterii : CriteriuSortareInterface[]): void {
        const pacientiSortati = [...this.patients()].sort((a, b) => {
            for(const criteriu of criterii) {
                let rez = 0;
                switch(criteriu.coloana) {
                    case 'nume':
                        rez = a.nume.localeCompare(
                            b.nume,
                            'ro',
                            {sensitivity: 'base'}
                        );
                        break;

                    case 'prenume':
                        rez = a.prenume.localeCompare(
                            b.prenume,
                            'ro',
                            {sensitivity: 'base'}
                        );
                        break;

                    case 'varsta':
                        rez = this.getAgeInMonths(a.data_nasterii) - this.getAgeInMonths(b.data_nasterii);
                        break;

                    case 'sex':
                        rez = Number(a.sex) - Number(b.sex);
                        break;  
                }
                if(rez !== 0) {
                    return criteriu.directie === 'asc' ? rez : -rez;
                }
            }
            return 0;
        });
        this.patients.set(pacientiSortati);
    }

    getSortDirection(coloana: ColSort): 'asc' | 'desc' | null {
        const criteriu = this.criteriuSortare().find(c => c.coloana === coloana);

        if(criteriu) {
            return criteriu.directie;
        }
        return null;
    }
}