import { Component, OnInit, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import QRCode from 'qrcode';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { DALService, Patient } from '../services/dal.service';
import { PatientService } from '../services/patient.service';
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
    searchText = signal('');

    constructor(
        private dal: DALService,
        public shared: SharedServicesService,
        public patientService: PatientService
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
        this.dal.getPatients().subscribe({
            next: data => {
                console.log('Pacienti:', data);
                this.defaultSort.set(data);
                this.patients.set(data);
            },
            error: error => {
                console.error('Eroare la incarcarea pacientilor:', error);
            }
        });
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
        const search = this.searchText().toLowerCase().trim();
        const filteredPatients = patients.filter(patient => {
            const nume = this.patientService.getNume(patient).toLowerCase();
            const prenume = this.patientService.getPrenume(patient).toLowerCase();
            const cnp = this.patientService.getCNP(patient);

            return (
                nume.includes(search) ||
                prenume.includes(search) ||
                cnp.includes(search)
            );
        });

        const pageSize = this.pageSize();
        const currentPage = this.currentPage();
        const start = (currentPage - 1) * pageSize;

        return filteredPatients.slice(start, start + pageSize);
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

        if(total === 0) {
            return [];
        }
        if(total <= 5) {
            return Array.from(
                { length: total },
                (_, i) => i + 1
            );
        }
        if(this.currentPage() <= 3) {
            return [
                1,
                2,
                3,
                4,
                '...',
                total
            ];
        }
        if(this.currentPage() >= total - 2) {
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
        if(!patient.id) {
            return;
        }
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
        if(!patient.id) {
            return;
        }
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
        if(!patient.id) {
            return;
        }
        const cnp = this.patientService.getCNP(patient);
        const cifreCNP = cnp.length >= 12 ? cnp.slice(7, 12) : '';
        const sex = this.patientService.getSexLabelLong(patient);
        this.linkQR = `https://example.com/${patient.id}|${cifreCNP}|${sex}`;
        this.numeQR =
            `${this.patientService.getNume(patient)} ` +
            `${this.patientService.getPrenume(patient)}`;
        try {
            this.imageQR = await QRCode.toDataURL(this.linkQR);
            this.showQR = true;
        }
        catch(err) {
            console.error('Eroare generare QR:', err);
        }
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
                        rez = this.patientService.getNume(a).localeCompare(
                            this.patientService.getNume(b),
                            'ro',
                            { sensitivity: 'base' }
                        );
                        break;

                    case 'prenume':
                        rez = this.patientService.getPrenume(a).localeCompare(
                            this.patientService.getPrenume(b),
                            'ro',
                            { sensitivity: 'base' }
                        );
                        break;

                    case 'varsta':
                        rez = this.patientService.getAgeInMonths(a) - this.patientService.getAgeInMonths(b);
                        break;

                    case 'sex':
                        rez = this.patientService.getSexOrder(a) - this.patientService.getSexOrder(b);
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