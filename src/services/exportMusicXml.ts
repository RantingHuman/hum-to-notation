import type { Project } from '../types/project';
import type { Note } from '../types/music';
import { getMeasureLengthBeats, groupNotesIntoMeasures } from '../utils/measureUtils';
import { midiToPitch, durationToMusicXmlType } from '../utils/musicXmlUtils';

const DIVISIONS = 8; // eighth note = 1 unit

function noteToXml(note: Note, octaveShift: number): string {
  const { type, dots, divisions } = durationToMusicXmlType(note.durationBeats);
  const dotsXml = '<dot/>'.repeat(dots);

  if (note.isRest) {
    return `
        <note>
          <rest/>
          <duration>${divisions}</duration>
          <type>${type}</type>${dotsXml}
        </note>`;
  }

  const effectiveMidi = Math.max(21, Math.min(108, note.midiNumber + octaveShift * 12));
  const { step, alter, octave } = midiToPitch(effectiveMidi);
  const alterXml = alter !== 0 ? `\n          <alter>${alter}</alter>` : '';

  return `
        <note>
          <pitch>
            <step>${step}</step>${alterXml}
            <octave>${octave}</octave>
          </pitch>
          <duration>${divisions}</duration>
          <type>${type}</type>${dotsXml}
        </note>`;
}

export function exportProjectToMusicXml(project: Project): Blob {
  const { numerator, denominator } = project.timeSignature;
  const microsecondsPerBeat = Math.round(60_000_000 / project.tempo);

  const partsXml = project.layers.map((layer, layerIdx) => {
    const partId = `P${layerIdx + 1}`;
    const clef = layer.instrument === 'bass' ? '<sign>F</sign><line>4</line>' : '<sign>G</sign><line>2</line>';
    const measures = groupNotesIntoMeasures(
      layer.notes,
      getMeasureLengthBeats(project.timeSignature)
    );

    const measuresXml = measures.map((measureNotes, mIdx) => {
      const attributesXml = mIdx === 0 ? `
        <attributes>
          <divisions>${DIVISIONS}</divisions>
          <key><fifths>0</fifths></key>
          <time>
            <beats>${numerator}</beats>
            <beat-type>${denominator}</beat-type>
          </time>
          <clef>${clef}</clef>
        </attributes>
        <direction placement="above">
          <direction-type>
            <metronome parentheses="no">
              <beat-unit>quarter</beat-unit>
              <per-minute>${project.tempo}</per-minute>
            </metronome>
          </direction-type>
          <sound tempo="${project.tempo}"/>
        </direction>` : '';

      const notesXml = measureNotes.map((n) => noteToXml(n, layer.octaveShift)).join('');

      return `
      <measure number="${mIdx + 1}">${attributesXml}${notesXml}
      </measure>`;
    });

    return `
    <part id="${partId}">
      ${measuresXml.join('')}
    </part>`;
  });

  const partListXml = project.layers.map((layer, idx) => {
    const partId = `P${idx + 1}`;
    const name = layer.instrument === 'guitar' ? 'Guitar' : 'Bass Guitar';
    return `
      <score-part id="${partId}">
        <part-name>${name}</part-name>
      </score-part>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN"
  "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>${escapeXml(project.name)}</work-title></work>
  <identification>
    <encoding>
      <software>Hum to Notation</software>
    </encoding>
  </identification>
  <part-list>${partListXml.join('')}
  </part-list>
  <!-- tempo: ${microsecondsPerBeat} microseconds per beat -->
  ${partsXml.join('')}
</score-partwise>`;

  return new Blob([xml], { type: 'text/xml' });
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
