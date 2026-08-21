import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface Identifier {
    system?: string;
    value?: string;
}
export interface HumanName {
    use?: string;
    family?: string;
    given?: string[];
}
export interface ContactPoint {
    system?: 'phone' | 'email' | 'fax' | 'pager' | 'url' | 'sms' | 'other';
    value?: string;
    use?: string;
    rank?: number;
}
export interface Address {
    use?: 'home' | 'work' | 'temp' | 'old' | 'billing';
    type?: 'postal' | 'physical' | 'both';
    text?: string;
    line?: string[];
    city?: string;
    district?: string;
    state?: string;
    postalCode?: string;
    country?: string;
}
export interface Annotation {
    text: string;
}
export interface Patient {
    resourceType: 'Patient';
    id?: string;
    active?: boolean;
    identifier?: Identifier[];
    name?: HumanName[];
    telecom?: ContactPoint[];
    gender?: 'male' | 'female' | 'other' | 'unknown';
    birthDate?: string;
    address?: Address[];
    note?: Annotation[];
}
export interface PatientBundle {
    resourceType: 'Bundle';
    type: string;
    total?: number;
    entry?: {
        resource: Patient;
    }[];
}

@Injectable({
    providedIn: 'root'
})

export class DALService {
    private api = 'http://localhost:3000/fhir';

    constructor(
        private http: HttpClient
    ) {}

    getPatients(): Observable<Patient[]> {
        return this.http
            .get<PatientBundle>(`${this.api}/Patient`)
            .pipe(
                map(bundle =>
                    (bundle.entry ?? []).map(
                        entry => entry.resource
                    )
                )
            );
    }

    getPatient(id: string): Observable<Patient> {
        return this.http.get<Patient>(`${this.api}/Patient/${id}`);
    }

    setPatient(patient: Patient): Observable<Patient> {
        if (patient.id) {
            return this.http.put<Patient>(`${this.api}/Patient/${patient.id}`,patient);
        }
        return this.http.post<Patient>(`${this.api}/Patient`,patient);
    }

    deletePatient(id: string): Observable<void> {
        return this.http.delete<void>(`${this.api}/Patient/${id}`);
    }
}