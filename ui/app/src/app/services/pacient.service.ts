import { Injectable } from '@angular/core';
import { Patient } from './dal.service';

@Injectable({
    providedIn: 'root'
})

export class PatientService {
    getNume(patient: Patient): string {
        return patient.name?.[0]?.family ?? '';
    }

    getPrenume(patient: Patient): string {
        return patient.name?.[0]?.given?.[0] ?? '';
    }

    getInitialeTata(patient: Patient): string {
        return patient.name?.[0]?.given?.[1] ?? '';
    }

    getCNP(patient: Patient): string {
        return (
            patient.identifier?.find(
                identifier =>
                    identifier.system === 'urn:cnp'
            )?.value ?? ''
        );
    }

    getSexLabel(patient: Patient): string {
        switch (patient.gender) {
            case 'male':
                return 'M';

            case 'female':
                return 'F';

            default:
                return '';
        }
    }

    getSexLabelLong(patient: Patient): string {
        switch (patient.gender) {
            case 'male':
                return 'MASCULIN';

            case 'female':
                return 'FEMININ';

            default:
                return 'NECUNOSCUT';
        }
    }

    getSexOrder(patient: Patient): number {
        switch (patient.gender) {
            case 'female':
                return 0;

            case 'male':
                return 1;

            case 'other':
                return 2;

            case 'unknown':
                return 3;

            default:
                return 4;
        }
    }

    getAge(patient: Patient): string {
        if(!patient.birthDate) {
            return '';
        }
        const dataNastere = new Date(patient.birthDate);
        if(isNaN(dataNastere.getTime())) {
            return '';
        }
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

    getAgeInMonths(patient: Patient): number {
        if(!patient.birthDate) {
            return 0;
        }
        const dataNastere = new Date(patient.birthDate);
        if(isNaN(dataNastere.getTime())) {
            return 0;
        }
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
}