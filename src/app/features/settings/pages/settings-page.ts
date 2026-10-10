import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { Theme } from '../../../core/models/theme.model';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ToastService } from '../../../core/services/toast.service';
import { PersistenceService } from '../../../core/storage/persistence.service';
import { RandomSource } from '../../../core/utils/random';
import { FormField } from '../../../shared/components/form-field/form-field';
import { RangeInput } from '../../../shared/components/range-input/range-input';
import {
  SegmentedControl,
  SegmentOption,
} from '../../../shared/components/segmented-control/segmented-control';
import { formatDuration } from '../../../shared/pipes/duration.pipe';
import { DemoScenarioButton } from '../../simulation/components/demo-scenario-button/demo-scenario-button';
import { ProcessingEngineService } from '../../simulation/engine/processing-engine.service';
import { retryDelayMs } from '../../simulation/engine/retry-policy';
import {
  DEFAULT_SIMULATION_SETTINGS,
  RetryStrategy,
  SETTINGS_LIMITS,
  SimulationSettings,
  SimulationSpeed,
} from '../../simulation/models/simulation-settings.model';
import { DEFAULT_DEMO_SEED } from '../../simulation/services/demo-scenario.service';
import { SimulationSettingsStore } from '../../simulation/services/simulation-settings.store';
import { EventLogStore } from '../../tasks/store/event-log.store';
import { TaskStore } from '../../tasks/store/task.store';

const BACKOFF_PREVIEW_LIMIT = 6;

/** The cap must not be lower than the first delay. */
function maxDelayNotBelowInitial(group: AbstractControl): ValidationErrors | null {
  const initial = group.get('initialRetryDelayMs')?.value as number;
  const max = group.get('maxRetryDelayMs')?.value as number;
  return max < initial ? { maxBelowInitial: true } : null;
}

@Component({
  selector: 'app-settings-page',
  imports: [ReactiveFormsModule, FormField, RangeInput, SegmentedControl, DemoScenarioButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
})
export class SettingsPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly settingsStore = inject(SimulationSettingsStore);
  private readonly themeService = inject(ThemeService);
  private readonly engine = inject(ProcessingEngineService);
  private readonly tasks = inject(TaskStore);
  private readonly events = inject(EventLogStore);
  private readonly random = inject(RandomSource);
  private readonly persistence = inject(PersistenceService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly limits = SETTINGS_LIMITS;
  protected readonly formatDuration = formatDuration;
  protected readonly formatCount = (value: number): string => String(value);
  protected readonly formatWorkers = (value: number): string =>
    value === 1 ? '1 worker' : `${value} workers`;

  protected readonly strategyOptions: readonly SegmentOption<RetryStrategy>[] = [
    { value: 'FIXED', label: 'Intervalo fixo' },
    { value: 'EXPONENTIAL', label: 'Exponential backoff' },
  ];
  protected readonly speedOptions: readonly SegmentOption<SimulationSpeed>[] = [
    { value: 0.5, label: '0,5×' },
    { value: 1, label: '1×' },
    { value: 2, label: '2×' },
    { value: 4, label: '4×' },
  ];
  protected readonly themeOptions: readonly SegmentOption<Theme>[] = [
    { value: 'dark', label: 'Escuro' },
    { value: 'light', label: 'Claro' },
  ];

  readonly form = this.fb.group(
    {
      maxConcurrency: [
        this.settingsStore.settings().maxConcurrency,
        [
          Validators.required,
          Validators.min(SETTINGS_LIMITS.maxConcurrency.min),
          Validators.max(SETTINGS_LIMITS.maxConcurrency.max),
        ],
      ],
      speed: this.fb.control<SimulationSpeed>(this.settingsStore.settings().speed),
      maxRetries: [
        this.settingsStore.settings().maxRetries,
        [
          Validators.required,
          Validators.min(SETTINGS_LIMITS.maxRetries.min),
          Validators.max(SETTINGS_LIMITS.maxRetries.max),
        ],
      ],
      retryStrategy: this.fb.control<RetryStrategy>(this.settingsStore.settings().retryStrategy),
      initialRetryDelayMs: [
        this.settingsStore.settings().initialRetryDelayMs,
        [
          Validators.required,
          Validators.min(SETTINGS_LIMITS.initialRetryDelayMs.min),
          Validators.max(SETTINGS_LIMITS.initialRetryDelayMs.max),
        ],
      ],
      maxRetryDelayMs: [
        this.settingsStore.settings().maxRetryDelayMs,
        [
          Validators.required,
          Validators.min(SETTINGS_LIMITS.maxRetryDelayMs.min),
          Validators.max(SETTINGS_LIMITS.maxRetryDelayMs.max),
        ],
      ],
    },
    { validators: maxDelayNotBelowInitial },
  );

  readonly themeControl = this.fb.control<Theme>(this.themeService.theme());

  readonly seedControl = this.fb.control(DEFAULT_DEMO_SEED, [
    Validators.required,
    Validators.min(0),
    Validators.max(999_999),
    Validators.pattern(/^\d+$/),
  ]);

  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });
  private readonly seedValue = toSignal(this.seedControl.valueChanges, {
    initialValue: this.seedControl.value,
  });
  private readonly formStatus = toSignal(this.form.statusChanges, {
    initialValue: this.form.status,
  });

  protected readonly delayError = computed(() =>
    this.formStatus() === 'INVALID' && this.form.hasError('maxBelowInitial')
      ? 'O limite máximo deve ser maior ou igual ao intervalo inicial.'
      : null,
  );

  /** "Tentativa 2: aguarda 1 s" … following the configured strategy. */
  protected readonly backoffPreview = computed(() => {
    const value = { ...DEFAULT_SIMULATION_SETTINGS, ...this.formValue() };
    const retries = Math.min(value.maxRetries, BACKOFF_PREVIEW_LIMIT);
    return Array.from({ length: retries }, (_, i) => ({
      attempt: i + 2,
      delay: formatDuration(retryDelayMs(i + 1, value)),
    }));
  });

  protected readonly demoSeed = computed(() => {
    const seed = Number(this.seedValue());
    return Number.isInteger(seed) && seed >= 0 && seed <= 999_999 ? seed : null;
  });

  protected readonly taskCount = this.tasks.count;
  protected readonly eventCount = computed(() => this.events.events().length);
  protected readonly storageAvailable = this.persistence.available;

  constructor() {
    // Changes apply immediately (even while the simulation runs) when valid.
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.form.valid) {
        this.settingsStore.update(this.form.getRawValue() as SimulationSettings);
      }
    });
    this.themeControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((theme) => this.themeService.setTheme(theme));

    // The header toggle can change the theme while this page is open.
    effect(() => {
      const theme = this.themeService.theme();
      if (this.themeControl.value !== theme) {
        this.themeControl.setValue(theme, { emitEvent: false });
      }
    });
  }

  protected resetSettings(): void {
    this.form.setValue({ ...DEFAULT_SIMULATION_SETTINGS });
    this.toast.show('Configurações padrão restauradas.');
  }

  protected async clearTasks(): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: 'Limpar tarefas e histórico?',
      message: `A simulação será interrompida e ${this.taskCount()} tarefa(s) e ${this.eventCount()} evento(s) serão apagados. Esta ação não pode ser desfeita.`,
      confirmLabel: 'Limpar dados',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }
    this.engine.stop();
    this.tasks.clear();
    this.events.clear();
    this.toast.show('Tarefas e histórico apagados.');
  }

  protected async eraseEverything(): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: 'Apagar todos os dados?',
      message:
        'Remove tarefas, histórico, configurações e preferência de tema salvos neste navegador. Esta ação não pode ser desfeita.',
      confirmLabel: 'Apagar tudo',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }
    this.engine.stop();
    this.tasks.clear();
    this.events.clear();
    this.random.reseed(null);
    this.form.setValue({ ...DEFAULT_SIMULATION_SETTINGS });
    this.themeService.setTheme('dark');
    this.persistence.clearStorage();
    this.toast.show('Todos os dados locais foram apagados.');
  }
}
