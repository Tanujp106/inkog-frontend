import styles from "./playground.module.css";
import DirectionPicker from "./direction-picker";

function Avatar({ name, tone = "" }: { name: string; tone?: string }) {
  return <span className={styles.avatar + " " + tone} aria-hidden="true">{name[0]}</span>;
}

function Pop() {
  return <section className={styles.pop} aria-label="Playful Pop">
    <div className={styles.popRail}><b>i✳</b><span>◉</span><span>▤</span><span>◌</span><Avatar name="t" /></div>
    <aside className={styles.popInbox}>
      <header><h2>Chats</h2><span>✎</span></header>
      <div className={styles.popSearch}>⌕ &nbsp; Search rooms</div>
      <div className={styles.popFilters}><b>All</b><span>Unread</span><span>Groups</span></div>
      <div className={styles.popChatActive}><span className={styles.popChatIcon}>✳</span><div><b>Friday dinner plans</b><small>river: Already looking at the menu.</small></div><time>8:16</time></div>
      <div className={styles.popChat}><span className={styles.popChatIconAlt}>✿</span><div><b>the usual suspects</b><small>moth: sent the photos</small></div><time>Tue</time></div>
      <div className={styles.popChat}><span className={styles.popChatIconThird}>☻</span><div><b>little weekend</b><small>Room closed · 6 people</small></div><time>Mon</time></div>
      <p className={styles.popInboxFoot}>Rooms come and go. The good stuff stays with you.</p>
    </aside>
    <main className={styles.popMain}>
      <header><span className={styles.popChatIcon}>✳</span><div><b>Friday dinner plans</b><small>moth, juniper, river + 1</small></div><span className={styles.popHeaderIcons}>⌕ &nbsp; ⋮</span></header>
      <div className={styles.popMessages}>
        <div className={styles.popDate}>TODAY</div>
        <div className={styles.popNotice}>This room closes in 42 minutes. Make the most of it ✳</div>
        <div className={styles.popBubble}><b>moth</b><p>Are we still doing dinner tomorrow?</p><time>8:14 PM</time></div>
        <div className={styles.popBubble}><b>juniper</b><p>Yes. Somewhere with very good noodles.</p><time>8:15 PM</time></div>
        <div className={styles.popPoll}><div><span>✳</span><b>Pick the place<small>Poll from juniper · 4 votes</small></b></div><p>Noodle House <b>3 votes</b></p><i /><p>Tiny Pizza <b>1 vote</b></p><i /></div>
        <div className={styles.popOwn}><p>Already looking at the menu.</p><time>8:16 PM ✓✓</time></div>
      </div>
      <div className={styles.popComposer}><span>＋</span><div>Message Friday dinner plans <b>☺</b></div><span>➤</span></div>
    </main>
  </section>;
}

function Minimal() {
  return <section className={styles.minimal} aria-label="Ultra-minimal">
    <aside className={styles.minSide}>
      <div className={styles.minBrand}><b>◫ &nbsp; inkog</b><span>⌄</span></div>
      <div className={styles.minSearch}>⌕ &nbsp; Search <kbd>⌘ K</kbd></div>
      <p>WORKSPACE</p><div>▤ &nbsp; Inbox <small>2</small></div><div>◷ &nbsp; Recent rooms</div><div>◇ &nbsp; Archive</div>
      <p>YOUR ROOMS <span>＋</span></p><div className={styles.minSelected}># &nbsp; Friday dinner plans</div><div># &nbsp; Studio notes</div><div># &nbsp; Weekend trip</div>
      <footer><Avatar name="t" /> Tanuj <span>⋯</span></footer>
    </aside>
    <main className={styles.minMain}>
      <header>Rooms <span>/</span> Friday dinner plans <i>↗ &nbsp; ⋯</i></header>
      <div className={styles.minColumns}>
        <div className={styles.minThread}>
          <small className={styles.minPath}>ROOM <b>INK-04</b> · PRIVATE</small>
          <h1>Friday dinner plans</h1>
          <p className={styles.minIntro}>A place to settle tomorrow's dinner before everyone gets busy.</p>
          <div className={styles.minPeople}><Avatar name="m" /><Avatar name="j" /><Avatar name="r" /><span>4 people &nbsp; · &nbsp; Closes in 42 min</span></div>
          <h2>Activity <span>3</span></h2>
          <div className={styles.minTime}>Today at 8:14 PM</div>
          <div className={styles.minMessage}><Avatar name="m" /><div><b>moth <time>8:14 PM</time></b><p>Are we still doing dinner tomorrow?</p></div></div>
          <div className={styles.minMessage}><Avatar name="j" /><div><b>juniper <time>8:15 PM</time></b><p>Yes. Somewhere with very good noodles.</p></div></div>
          <div className={styles.minMessage}><Avatar name="r" /><div><b>river <time>8:16 PM</time></b><p>Already looking at the menu.</p></div></div>
          <div className={styles.minComposer}>Leave a message… <span>↵</span></div>
        </div>
        <aside className={styles.minProperties}>
          <h2>Room details</h2>
          <dl><dt>Status</dt><dd>● &nbsp; Open</dd><dt>Visibility</dt><dd>Private</dd><dt>Expires</dt><dd>Tonight, 9:00 PM</dd><dt>Members</dt><dd>4 people</dd></dl>
          <h2>Decision</h2><small>ACTIVE POLL</small><h3>Pick the place</h3>
          <p>Noodle House <b>75%</b></p><div className={styles.minBar}><i /></div>
          <p>Tiny Pizza <b>25%</b></p><div className={styles.minBar}><i /></div>
          <small>4 votes · closes with the room</small>
        </aside>
      </div>
    </main>
  </section>;
}

function Brutal() {
  return <section className={styles.brutal} aria-label="Web Brutalist">
    <header><strong>INKOG<sup>®</sup></strong><span>PRIVATE ROOMS / ISSUE 004</span><span>OPEN UNTIL 21:00 &nbsp; ↗</span></header>
    <div className={styles.brutalColumns}>
      <aside className={styles.brutalIndex}><small>INDEX</small><h2>ROOMS <sup>03</sup></h2><div className={styles.brutalActive}><b>01</b> FRIDAY DINNER<br />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; PLANS <span>↗</span></div><div><b>02</b> STUDIO NOTES <span>↗</span></div><div><b>03</b> WEEKEND TRIP <span>↗</span></div><footer>AN INSTANT IS<br />ENOUGH.</footer></aside>
      <main className={styles.brutalThread}><small>ROOM 001 &nbsp; / &nbsp; FOUR PEOPLE &nbsp; / &nbsp; 42 MIN LEFT</small><h1>FRIDAY<br />DINNER PLANS<span>↗</span></h1><div className={styles.brutalSectionHead}>CONVERSATION <span>03 ENTRIES</span></div><div className={styles.brutalEntry}><small>01 / MOTH<br />20:14</small><p>Are we still doing dinner tomorrow?</p></div><div className={styles.brutalEntry}><small>02 / JUNIPER<br />20:15</small><p>Yes. Somewhere with very good noodles.</p></div><div className={styles.brutalEntry}><small>03 / RIVER<br />20:16</small><p>Already looking at the menu.</p></div><div className={styles.brutalComposer}>ADD TO CONVERSATION <span>↗</span></div></main>
      <aside className={styles.brutalPoll}><div>LIVE DECISION <b>04</b></div><h2>WHERE<br />ARE WE<br />GOING?</h2><p>01 &nbsp; NOODLE HOUSE <b>75%</b></p><div className={styles.brutalBar}><i /></div><p>02 &nbsp; TINY PIZZA <b>25%</b></p><div className={styles.brutalBar}><i /></div><footer>PICK THE PLACE.<br />GET ON WITH IT. <span>↗</span></footer></aside>
    </div>
  </section>;
}

function Dream() {
  return <section className={styles.dream} aria-label="Dreamworld">
    <header><strong>inkog <span>✳</span></strong><nav>Home <span>My rooms</span><span>How it works</span></nav><div><Avatar name="t" /> Hey, Tanuj</div></header>
    <div className={styles.dreamColumns}>
      <aside className={styles.dreamFeature}><div className={styles.dreamArt}><span>✳</span><i>✷</i></div><h2>Good conversations make room for everyone.</h2><p>Little spaces for the things worth talking through.</p><div>Start a room <span>↗</span></div></aside>
      <main className={styles.dreamMain}><small>SUNDAY EVENING · YOUR SPACE</small><h1>Make yourself at home.</h1><p>Pick up where your people left off.</p>
        <div className={styles.dreamRoom}><div className={styles.dreamRoomTop}><span>✻</span><small>OPEN ROOM · 42 MIN LEFT</small></div><h2>Friday dinner plans</h2><p>Somewhere with very good noodles, please.</p><footer><span><Avatar name="m" /><Avatar name="j" /><Avatar name="r" /> 4 people here</span><b>Open room ↗</b></footer></div>
        <div className={styles.dreamLower}><div className={styles.dreamRecent}><h2>From the conversation <span>View all ↗</span></h2><div><Avatar name="j" /><p><b>juniper <small>8:15 PM</small></b><br />Yes. Somewhere with very good noodles.</p></div><div><Avatar name="r" /><p><b>river <small>8:16 PM</small></b><br />Already looking at the menu.</p></div><footer>Leave a message <span>↗</span></footer></div><div className={styles.dreamDecision}><h2>One little decision <span>4 votes</span></h2><p>Pick the place</p><div>Noodle House <b>3</b></div><div>Tiny Pizza <b>1</b></div><small>Looks like noodles it is.</small></div></div>
      </main>
    </div>
  </section>;
}

function Arcade() {
  return <section className={styles.arcade} aria-label="Arcade Future">
    <div className={styles.arcadeRail}><b>i</b><span>✳</span><span>◈</span><span>＋</span><span>⌕</span></div>
    <aside className={styles.arcadeChannels}><header>INKOG / PRIVATE <span>⌄</span></header><p>YOUR SPACE</p><div>◉ &nbsp; Overview</div><div>◷ &nbsp; Recent</div><p>OPEN ROOMS <span>＋</span></p><div className={styles.arcadeActive}># &nbsp; friday-dinner</div><div># &nbsp; studio-notes</div><div># &nbsp; weekend-trip</div><p>ROOM INFO</p><div>◌ &nbsp; 4 members online</div><div>◷ &nbsp; 42 min remaining</div><footer><Avatar name="t" /><span><b>Tanuj</b><small>In a room</small></span>⚙</footer></aside>
    <main className={styles.arcadeMain}><header><b># &nbsp; friday-dinner</b><span>Plans for tomorrow, made tonight.</span><i>⌕ &nbsp; ☷</i></header><div className={styles.arcadeMessages}><div className={styles.arcadeWelcome}><span>#</span><h1>Welcome to #friday-dinner</h1><p>A temporary room for tomorrow's plans. It closes in 42 minutes.</p></div><div className={styles.arcadeToday}>TODAY</div><div className={styles.arcadeMessage}><Avatar name="m" /><p><b>moth <time>8:14 PM</time></b><br />Are we still doing dinner tomorrow?</p></div><div className={styles.arcadeMessage}><Avatar name="j" /><p><b>juniper <time>8:15 PM</time></b><br />Yes. Somewhere with very good noodles.</p></div><div className={styles.arcadePoll}><small>◈ &nbsp; ROOM POLL</small><h2>Pick the place</h2><p>Noodle House <b>3</b></p><div><i /></div><p>Tiny Pizza <b>1</b></p><div><i /></div><small>4 votes so far</small></div><div className={styles.arcadeMessage}><Avatar name="r" /><p><b>river <time>8:16 PM</time></b><br />Already looking at the menu.</p></div></div><div className={styles.arcadeComposer}>＋ &nbsp; Message #friday-dinner <span>☺ &nbsp; ▧</span></div></main>
    <aside className={styles.arcadeDetails}><header>ROOM DETAILS <span>⋯</span></header><div className={styles.arcadeCover}>✳</div><h2>Friday dinner plans</h2><p>Plans for tomorrow, made tonight.</p><small>ROOM STATUS</small><div className={styles.arcadeLive}>● &nbsp; Open · 42 min left</div><small>MEMBERS — 4</small><div><Avatar name="m" /> moth</div><div><Avatar name="j" /> juniper</div><div><Avatar name="r" /> river</div><div><Avatar name="t" /> you</div></aside>
  </section>;
}

export default function PlaygroundPage() {
  return <div className={styles.playground}>
    <DirectionPicker />
    <div className={styles.screens}><Pop /><Minimal /><Brutal /><Dream /><Arcade /></div>
  </div>;
}
