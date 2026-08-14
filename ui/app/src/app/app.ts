import { Component, signal } from '@angular/core';
import { ListaPacientiComponent } from "./lista-pacienti.component/lista-pacienti.component";
import { HeaderComponent } from './header.component/header.component';
import { InfoPacientiComponent } from "./info-pacienti.component/info-pacienti.component";

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [
    ListaPacientiComponent, 
    HeaderComponent,
    InfoPacientiComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})

export class App {
  // ?
}
