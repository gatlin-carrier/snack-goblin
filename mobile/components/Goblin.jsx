import Svg, { Circle, Ellipse, Path, Rect, G } from 'react-native-svg';
import { View, Text } from 'react-native';

const PALETTE = {
  skin:  '#8DB87A',
  ink:   '#2D1F14',
  cheek: '#D4703A',
  hat:   '#F0EDE6',
};

function GoblinSvg({ state = 'idle', size = 48, lookProgress = 0, smileProgress = 0 }) {
  const s = size;
  const cx = s / 2;
  const cy = s * 0.62;
  const r  = s * 0.32;

  // Hat sits ON the head — brim top is just below the head crown
  const brimY = cy - r + s * 0.02;

  const eyes = {
    idle:     <G><Ellipse cx={cx - s*0.10} cy={cy - s*0.04} rx={s*0.035} ry={s*0.042} fill={PALETTE.ink}/><Ellipse cx={cx + s*0.10} cy={cy - s*0.04} rx={s*0.035} ry={s*0.042} fill={PALETTE.ink}/></G>,
    sleeping: <G><Path d={`M ${cx-s*0.13} ${cy-s*0.04} Q ${cx-s*0.10} ${cy-s*0.07} ${cx-s*0.07} ${cy-s*0.04}`} stroke={PALETTE.ink} strokeWidth={s*0.025} fill="none" strokeLinecap="round"/><Path d={`M ${cx+s*0.07} ${cy-s*0.04} Q ${cx+s*0.10} ${cy-s*0.07} ${cx+s*0.13} ${cy-s*0.04}`} stroke={PALETTE.ink} strokeWidth={s*0.025} fill="none" strokeLinecap="round"/></G>,
    curious:  <G><Ellipse cx={cx - s*0.10} cy={cy - s*0.04} rx={s*0.045} ry={s*0.05} fill={PALETTE.ink}/><Ellipse cx={cx + s*0.10} cy={cy - s*0.04} rx={s*0.045} ry={s*0.05} fill={PALETTE.ink}/><Circle cx={cx-s*0.09} cy={cy-s*0.05} r={s*0.012} fill="white"/><Circle cx={cx+s*0.11} cy={cy-s*0.05} r={s*0.012} fill="white"/></G>,
    cooking:  <G><Path d={`M ${cx-s*0.13} ${cy-s*0.06} Q ${cx-s*0.10} ${cy-s*0.01} ${cx-s*0.07} ${cy-s*0.06}`} stroke={PALETTE.ink} strokeWidth={s*0.025} fill="none" strokeLinecap="round"/><Path d={`M ${cx+s*0.07} ${cy-s*0.06} Q ${cx+s*0.10} ${cy-s*0.01} ${cx+s*0.13} ${cy-s*0.06}`} stroke={PALETTE.ink} strokeWidth={s*0.025} fill="none" strokeLinecap="round"/></G>,
    hungry:   <G><Ellipse cx={cx - s*0.10} cy={cy - s*0.04} rx={s*0.038} ry={s*0.05} fill={PALETTE.ink}/><Ellipse cx={cx + s*0.10} cy={cy - s*0.04} rx={s*0.038} ry={s*0.05} fill={PALETTE.ink}/><Path d={`M ${cx-s*0.08} ${cy-s*0.08} L ${cx-s*0.12} ${cy-s*0.12}`} stroke={PALETTE.ink} strokeWidth={s*0.02} strokeLinecap="round"/><Path d={`M ${cx+s*0.08} ${cy-s*0.08} L ${cx+s*0.12} ${cy-s*0.12}`} stroke={PALETTE.ink} strokeWidth={s*0.02} strokeLinecap="round"/></G>,
    'well-fed':<G><Path d={`M ${cx-s*0.12} ${cy-s*0.03} Q ${cx-s*0.10} ${cy-s*0.07} ${cx-s*0.08} ${cy-s*0.03}`} stroke={PALETTE.ink} strokeWidth={s*0.025} fill="none" strokeLinecap="round"/><Path d={`M ${cx+s*0.08} ${cy-s*0.03} Q ${cx+s*0.10} ${cy-s*0.07} ${cx+s*0.12} ${cy-s*0.03}`} stroke={PALETTE.ink} strokeWidth={s*0.025} fill="none" strokeLinecap="round"/></G>,
    fixated:  <G><Ellipse cx={cx - s*0.10} cy={cy - s*0.04} rx={s*0.025} ry={s*0.03} fill={PALETTE.ink}/><Ellipse cx={cx + s*0.10} cy={cy - s*0.04} rx={s*0.025} ry={s*0.03} fill={PALETTE.ink}/></G>,
  };

  const mouths = {
    // Resting smirk — right corner higher than left
    idle:     <Path d={`M ${cx-s*0.07} ${cy+s*0.08} Q ${cx+s*0.01} ${cy+s*0.12} ${cx+s*0.09} ${cy+s*0.05}`} stroke={PALETTE.ink} strokeWidth={s*0.022} fill="none" strokeLinecap="round"/>,
    sleeping: <Path d={`M ${cx-s*0.05} ${cy+s*0.07} Q ${cx} ${cy+s*0.09} ${cx+s*0.05} ${cy+s*0.07}`} stroke={PALETTE.ink} strokeWidth={s*0.02} fill="none" strokeLinecap="round"/>,
    curious:  <Circle cx={cx} cy={cy+s*0.07} r={s*0.04} fill={PALETTE.ink}/>,
    cooking:  <Path d={`M ${cx-s*0.10} ${cy+s*0.05} Q ${cx} ${cy+s*0.13} ${cx+s*0.10} ${cy+s*0.05}`} stroke={PALETTE.ink} strokeWidth={s*0.022} fill="none" strokeLinecap="round"/>,
    hungry:   <Path d={`M ${cx-s*0.08} ${cy+s*0.09} Q ${cx} ${cy+s*0.05} ${cx+s*0.08} ${cy+s*0.09}`} stroke={PALETTE.ink} strokeWidth={s*0.022} fill="none" strokeLinecap="round"/>,
    'well-fed':<Path d={`M ${cx-s*0.10} ${cy+s*0.05} Q ${cx} ${cy+s*0.13} ${cx+s*0.10} ${cy+s*0.05}`} stroke={PALETTE.ink} strokeWidth={s*0.022} fill="rgba(212,112,58,0.5)" strokeLinecap="round"/>,
    fixated:  <Path d={`M ${cx-s*0.06} ${cy+s*0.06} L ${cx+s*0.06} ${cy+s*0.06}`} stroke={PALETTE.ink} strokeWidth={s*0.02} strokeLinecap="round"/>,
  };

  const showHat = state !== 'sleeping';

  // Anime highlights — drift downward as goblin looks at the text field
  const eyeCY = cy - s * 0.04;
  const hlY = eyeCY - s*0.016 + s*0.028 * lookProgress;
  const activeEyes = lookProgress > 0 ? (
    <G>
      <Ellipse cx={cx - s*0.10} cy={eyeCY} rx={s*0.035} ry={s*0.042} fill={PALETTE.ink}/>
      <Ellipse cx={cx + s*0.10} cy={eyeCY} rx={s*0.035} ry={s*0.042} fill={PALETTE.ink}/>
      <Circle cx={cx - s*0.111} cy={hlY} r={s*0.011} fill="white"/>
      <Circle cx={cx + s*0.089} cy={hlY} r={s*0.011} fill="white"/>
      <Circle cx={cx - s*0.097} cy={hlY + s*0.013} r={s*0.006} fill="rgba(255,255,255,0.6)"/>
      <Circle cx={cx + s*0.103} cy={hlY + s*0.013} r={s*0.006} fill="rgba(255,255,255,0.6)"/>
    </G>
  ) : null;

  // Smile: activated from the FIRST keypress (lookProgress > 0) so there's never a flat
  // line transition. Baseline ctrl depth is s*0.10 so even at smileProgress=0 it's a
  // visible gentle smile, growing to a big grin at smileProgress=1.
  const smileW    = s * (0.07 + 0.07 * smileProgress);
  const smileCtrlY = cy + s * (0.10 + 0.08 * smileProgress);
  const smileFill  = smileProgress > 0.3
    ? `rgba(212,112,58,${((smileProgress - 0.3) * 0.6).toFixed(2)})`
    : 'none';
  const activeMouth = lookProgress > 0 ? (
    <Path
      d={`M ${cx - smileW} ${cy + s*0.06} Q ${cx} ${smileCtrlY} ${cx + smileW} ${cy + s*0.06}`}
      stroke={PALETTE.ink} strokeWidth={s * 0.022} fill={smileFill} strokeLinecap="round"
    />
  ) : null;

  // Dome — toque blanche silhouette, sides bulge wider than the brim then round to a peak
  const dome = [
    `M ${cx - s*0.18} ${brimY}`,
    `C ${cx - s*0.28} ${brimY - s*0.05}`,
    `  ${cx - s*0.28} ${brimY - s*0.17}`,
    `  ${cx - s*0.17} ${brimY - s*0.25}`,
    `C ${cx - s*0.10} ${brimY - s*0.31}`,
    `  ${cx + s*0.10} ${brimY - s*0.31}`,
    `  ${cx + s*0.17} ${brimY - s*0.25}`,
    `C ${cx + s*0.28} ${brimY - s*0.17}`,
    `  ${cx + s*0.28} ${brimY - s*0.05}`,
    `  ${cx + s*0.18} ${brimY}`,
    'Z',
  ].join(' ');

  return (
    <Svg width={s} height={s * 1.12} viewBox={`0 ${-s * 0.12} ${s} ${s * 1.12}`}>
      {/* Pointy ears — behind head so it clips them cleanly */}
      <Path
        d={`M ${cx-r+s*0.01} ${cy+s*0.04} Q ${cx-r-s*0.08} ${cy+s*0.05} ${cx-r-s*0.14} ${cy-s*0.07} Q ${cx-r-s*0.08} ${cy-s*0.12} ${cx-r+s*0.01} ${cy-s*0.06} Z`}
        fill={PALETTE.skin}
      />
      <Path
        d={`M ${cx+r-s*0.01} ${cy+s*0.04} Q ${cx+r+s*0.08} ${cy+s*0.05} ${cx+r+s*0.14} ${cy-s*0.07} Q ${cx+r+s*0.08} ${cy-s*0.12} ${cx+r-s*0.01} ${cy-s*0.06} Z`}
        fill={PALETTE.skin}
      />
      <Path d={`M ${cx-r-s*0.01} ${cy+s*0.01} Q ${cx-r-s*0.07} ${cy-s*0.03} ${cx-r-s*0.10} ${cy-s*0.06}`}
        stroke={PALETTE.cheek} strokeWidth={s*0.013} fill="none" opacity={0.35} strokeLinecap="round"/>
      <Path d={`M ${cx+r+s*0.01} ${cy+s*0.01} Q ${cx+r+s*0.07} ${cy-s*0.03} ${cx+r+s*0.10} ${cy-s*0.06}`}
        stroke={PALETTE.cheek} strokeWidth={s*0.013} fill="none" opacity={0.35} strokeLinecap="round"/>

      {/* Head */}
      <Circle cx={cx} cy={cy} r={r} fill={PALETTE.skin}/>

      {/* Cheeks */}
      <Ellipse cx={cx - s*0.19} cy={cy - s*0.01} rx={s*0.065} ry={s*0.040} fill={PALETTE.cheek} opacity={0.30}/>
      <Ellipse cx={cx + s*0.19} cy={cy - s*0.01} rx={s*0.065} ry={s*0.040} fill={PALETTE.cheek} opacity={0.30}/>

      {/* Chef hat */}
      {showHat && <>
        <Path d={dome} fill="white" stroke="#A89070" strokeWidth={s * 0.018}/>
        <Path
          d={`M ${cx - s*0.08} ${brimY - s*0.03} Q ${cx - s*0.074} ${brimY - s*0.15} ${cx - s*0.08} ${brimY - s*0.27}`}
          stroke="#BFAD95" strokeWidth={s*0.010} fill="none" opacity={0.45} strokeLinecap="round"
        />
        <Path
          d={`M ${cx + s*0.08} ${brimY - s*0.03} Q ${cx + s*0.074} ${brimY - s*0.15} ${cx + s*0.08} ${brimY - s*0.27}`}
          stroke="#BFAD95" strokeWidth={s*0.010} fill="none" opacity={0.45} strokeLinecap="round"
        />
        <Rect
          x={cx - s*0.22} y={brimY} width={s*0.44} height={s*0.09} rx={s*0.03}
          fill={PALETTE.hat} stroke="#A89070" strokeWidth={s*0.018}
        />
        {/* Horns — base extends below the brim into the green head area so they read as
            connected to the skull. Rounded teardrop shape, not sharp triangles. */}
        <Path
          d={`M ${cx-s*0.17} ${brimY+s*0.12} Q ${cx-s*0.13} ${brimY+s*0.04} ${cx-s*0.20} ${brimY-s*0.10} Q ${cx-s*0.27} ${brimY+s*0.03} ${cx-s*0.24} ${brimY+s*0.12} Q ${cx-s*0.205} ${brimY+s*0.17} ${cx-s*0.17} ${brimY+s*0.12} Z`}
          fill={PALETTE.skin} stroke="#5A8247" strokeWidth={s*0.015} strokeLinejoin="round"
        />
        <Path
          d={`M ${cx+s*0.24} ${brimY+s*0.12} Q ${cx+s*0.27} ${brimY+s*0.03} ${cx+s*0.20} ${brimY-s*0.10} Q ${cx+s*0.13} ${brimY+s*0.04} ${cx+s*0.17} ${brimY+s*0.12} Q ${cx+s*0.205} ${brimY+s*0.17} ${cx+s*0.24} ${brimY+s*0.12} Z`}
          fill={PALETTE.skin} stroke="#5A8247" strokeWidth={s*0.015} strokeLinejoin="round"
        />
      </>}

      {/* Eyes */}
      {activeEyes || eyes[state] || eyes.idle}
      {/* Mouth */}
      {activeMouth || mouths[state] || mouths.idle}
    </Svg>
  );
}

const STATE_COPY = {
  idle:      "your snack goblin is here.",
  sleeping:  "the goblin is napping. plan something to wake it up.",
  curious:   "the goblin is curious. tap to see what's cooking.",
  cooking:   "the goblin is on it.",
  'well-fed':"the goblin is satisfied. nice week.",
  hungry:    "the goblin is worried. add some meals?",
  fixated:   "the goblin has noticed a pattern.",
};

export function GoblinWidget({ state = 'idle', size = 56, showCopy = true, lookProgress = 0, smileProgress = 0 }) {
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <GoblinSvg state={state} size={size} lookProgress={lookProgress} smileProgress={smileProgress}/>
      {showCopy && (
        <Text style={{ fontSize: 11, color: '#7A6150', textAlign: 'center', fontStyle: 'italic', maxWidth: 160 }}>
          {STATE_COPY[state] || STATE_COPY.idle}
        </Text>
      )}
    </View>
  );
}

export default GoblinSvg;
