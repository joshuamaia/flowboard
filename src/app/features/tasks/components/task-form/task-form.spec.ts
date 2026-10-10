import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewTaskInput } from '../../models/task.model';
import { TaskForm } from './task-form';

describe('TaskForm', () => {
  let fixture: ComponentFixture<TaskForm>;
  let component: TaskForm;
  let element: HTMLElement;
  let emitted: NewTaskInput[];

  beforeEach(async () => {
    fixture = TestBed.createComponent(TaskForm);
    component = fixture.componentInstance;
    element = fixture.nativeElement as HTMLElement;
    emitted = [];
    component.submitted.subscribe((value) => emitted.push(value));
    await fixture.whenStable();
  });

  const submit = async () => {
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();
  };

  it('starts with sensible defaults', () => {
    expect(component.form.getRawValue()).toEqual({
      title: '',
      description: '',
      priority: 'MEDIUM',
      durationMs: 3000,
      failureProbability: 0.2,
    });
  });

  it('requires a title and shows the message after submit', async () => {
    await submit();

    expect(emitted).toEqual([]);
    expect(component.form.controls.title.hasError('required')).toBe(true);
    expect(element.querySelector('#task-title-error')?.textContent).toContain('Campo obrigatório');
  });

  it('rejects whitespace-only and too short titles', () => {
    const title = component.form.controls.title;

    title.setValue('   ');
    expect(title.hasError('blank')).toBe(true);

    title.setValue('ab');
    expect(title.hasError('minlength')).toBe(true);
  });

  it('enforces bounds on duration and failure probability', () => {
    const { durationMs, failureProbability } = component.form.controls;

    durationMs.setValue(100);
    failureProbability.setValue(1.5);

    expect(durationMs.hasError('min')).toBe(true);
    expect(failureProbability.hasError('max')).toBe(true);
    expect(component.form.invalid).toBe(true);
  });

  it('limits the description length', () => {
    component.form.controls.description.setValue('x'.repeat(281));

    expect(component.form.controls.description.hasError('maxlength')).toBe(true);
  });

  it('emits a normalized task input when valid', async () => {
    component.form.setValue({
      title: '  Sincronizar estoque ',
      description: '  ',
      priority: 'HIGH',
      durationMs: 5000,
      failureProbability: 0.5,
    });

    await submit();

    expect(emitted).toEqual([
      { title: 'Sincronizar estoque', priority: 'HIGH', durationMs: 5000, failureProbability: 0.5 },
    ]);
  });

  it('updates the priority through the radio group', async () => {
    element.querySelector<HTMLInputElement>('input[type="radio"][value="LOW"]')!.click();
    await fixture.whenStable();

    expect(component.form.controls.priority.value).toBe('LOW');
  });
});
