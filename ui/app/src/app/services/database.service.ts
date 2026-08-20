import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Patient {
    id: string;
    nume: string;
    prenume: string;
    data_nasterii: string;
    sex: boolean;
    cnp: string;
}
export type NewPatient = Omit<Patient, 'id'>;

@Injectable({
    providedIn: 'root'
})

export class DatabaseService {
    private api = 'http://localhost:3000';

    constructor(private http: HttpClient) {}

    getPatients(): Observable<Patient[]> {
        return this.http.get<Patient[]>(`${this.api}/fhir/Patient`);
    }

    getPatient(id: string): Observable<Patient> {
        return this.http.get<Patient>(`${this.api}/fhir/Patient/${id}`);
    }

    setPatient(patient: Patient | NewPatient): Observable<Patient> {
        if('id' in patient) {
            return this.http.put<Patient>(
                `${this.api}/fhir/Patient/${patient.id}`,
                patient
            );
        }
        return this.http.post<Patient>(
            `${this.api}/fhir/Patient`,
            patient
        );
    }

    deletePatient(id: string): Observable<any> {
        return this.http.delete(`${this.api}/fhir/Patient/${id}`);
    }

}