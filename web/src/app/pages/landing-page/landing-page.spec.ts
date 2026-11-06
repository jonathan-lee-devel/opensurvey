import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LandingPage } from './landing-page';

describe('LandingPage', () => {
  let fixture: ComponentFixture<LandingPage>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingPage);
    await fixture.whenStable();
    el = fixture.nativeElement as HTMLElement;
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders a single h1 in the hero', () => {
    const headings = el.querySelectorAll('h1');
    expect(headings.length).toBe(1);
    expect(headings[0].textContent).toContain('Open-source surveys');
  });

  it('renders landmarks for header, main navigation, main, and footer', () => {
    expect(el.querySelector('header')).not.toBeNull();
    expect(el.querySelector('nav[aria-label="Primary"]')).not.toBeNull();
    expect(el.querySelector('main#main')).not.toBeNull();
    expect(el.querySelector('footer')).not.toBeNull();
  });

  it('renders one card per feature', () => {
    expect(el.querySelectorAll('.features .card').length).toBe(6);
  });

  it('renders the get started steps with their commands', () => {
    const steps = el.querySelectorAll('.steps .step');
    expect(steps.length).toBe(3);
    expect(steps[1].textContent).toContain('yarn start:dev');
  });
});
