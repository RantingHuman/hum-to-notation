import { describe, expect, it } from 'vitest';
import { exportProjectToMusicXml } from './exportMusicXml';
import type { Project } from '../types/project';

function project(notes: Project['layers'][number]['notes']): Project {
  return {
    id: 'p1',
    name: 'Test',
    tempo: 120,
    timeSignature: { numerator: 4, denominator: 4 },
    metronomeMode: 'visual',
    createdAt: '',
    updatedAt: '',
    layers: [{ id: 'l1', instrument: 'guitar', octaveShift: 0, notes }],
  };
}

describe('exportProjectToMusicXml', () => {
  it('ties a note that crosses a barline', async () => {
    const xml = await exportProjectToMusicXml(
      project([
        { midiNumber: 0, startBeat: 0, durationBeats: 3, isRest: true },
        { midiNumber: 60, startBeat: 3, durationBeats: 3 },
      ])
    ).text();

    const measures = xml.split('<measure ').slice(1);
    expect(measures).toHaveLength(2);
    expect(measures[0]).toContain('<tie type="start"/>');
    expect(measures[0]).toContain('<tied type="start"/>');
    expect(measures[1]).toContain('<tie type="stop"/>');
    expect(measures[1]).toContain('<tied type="stop"/>');
  });

  it('writes no ties for notes that fit in their measure', async () => {
    const xml = await exportProjectToMusicXml(
      project([{ midiNumber: 60, startBeat: 0, durationBeats: 2 }])
    ).text();

    expect(xml).not.toContain('<tie');
  });
});
