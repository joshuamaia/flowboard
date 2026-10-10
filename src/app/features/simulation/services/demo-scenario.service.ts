import { inject, Injectable } from '@angular/core';

import { createSeededGenerator, RandomSource } from '../../../core/utils/random';
import { NewTaskInput, TaskPriority } from '../../tasks/models/task.model';
import { EventLogStore } from '../../tasks/store/event-log.store';
import { TaskStore } from '../../tasks/store/task.store';
import { ProcessingEngineService } from '../engine/processing-engine.service';

export const DEFAULT_DEMO_SEED = 42;
export const DEMO_TASK_COUNT = 12;

const JOBS: readonly { title: string; description: string }[] = [
  { title: 'Processar pagamentos', description: 'Lote de cobranças pendentes do gateway.' },
  { title: 'Gerar relatório financeiro', description: 'Consolidação mensal de receitas.' },
  { title: 'Sincronizar estoque', description: 'Atualiza saldos com o ERP.' },
  { title: 'Enviar e-mails de boas-vindas', description: 'Novos cadastros das últimas 24 h.' },
  { title: 'Redimensionar imagens', description: 'Thumbnails para o catálogo.' },
  { title: 'Indexar catálogo de busca', description: 'Reindexação incremental de produtos.' },
  { title: 'Backup do banco de dados', description: 'Snapshot diário compactado.' },
  { title: 'Importar CSV de clientes', description: 'Planilha enviada pelo time comercial.' },
  { title: 'Calcular comissões', description: 'Fechamento de vendas do período.' },
  { title: 'Notificar webhooks', description: 'Eventos para integrações de parceiros.' },
  { title: 'Transcodificar vídeos', description: 'Versões 720p e 1080p.' },
  { title: 'Consolidar logs', description: 'Agrega logs de acesso por hora.' },
];

const PRIORITIES: readonly TaskPriority[] = ['HIGH', 'MEDIUM', 'MEDIUM', 'LOW', 'LOW', 'HIGH'];

/**
 * Builds a varied, presentation-friendly queue. With a seed, both the tasks and
 * the engine's failure rolls are deterministic, so the same run can be repeated
 * (e.g. to record a video).
 */
@Injectable({ providedIn: 'root' })
export class DemoScenarioService {
  private readonly tasks = inject(TaskStore);
  private readonly events = inject(EventLogStore);
  private readonly engine = inject(ProcessingEngineService);
  private readonly random = inject(RandomSource);

  /** Pure generation of the scenario's tasks for a given random generator. */
  static buildTasks(next: () => number, count = DEMO_TASK_COUNT): NewTaskInput[] {
    return Array.from({ length: count }, (_, index) => {
      const job = JOBS[index % JOBS.length];
      const roll = next();
      return {
        title: job.title,
        description: job.description,
        priority: PRIORITIES[Math.floor(next() * PRIORITIES.length)],
        // 1.0 s – 8.0 s in 500 ms steps
        durationMs: 1000 + Math.round(next() * 14) * 500,
        // Most tasks are reliable, a few are flaky: 0–15% or 35–70%.
        failureProbability:
          roll < 0.7 ? Math.round(next() * 3) * 0.05 : 0.35 + Math.round(next() * 7) * 0.05,
      };
    });
  }

  /**
   * Replaces the current queue with a demo scenario. Pass a seed for a
   * reproducible run, or null for a random one. Returns the number of tasks.
   */
  generate(seed: number | null): number {
    this.engine.stop();
    this.tasks.clear();
    this.events.clear();

    const next = seed === null ? Math.random : createSeededGenerator(seed);
    // Failure rolls get their own stream derived from the same seed.
    this.random.reseed(seed === null ? null : seed + 1);

    const scenario = DemoScenarioService.buildTasks(next);
    for (const task of scenario) {
      this.tasks.create(task);
    }
    return scenario.length;
  }
}
