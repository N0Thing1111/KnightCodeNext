-- Content-only revision: programming logic, tracing, debugging and game practice.
-- Changes only description, learning_objective and content for lessons 1-7.
-- Keeps IDs, titles, active/order flags, assignments, levels and student progress.
-- On a fresh empty database, seed.sql supplies the revised lessons afterwards.
begin;
lock table public.lessons in share row exclusive mode;
do $lesson_guard$
declare existing_count integer;
begin
  select count(*) into existing_count from public.lessons where id between 1 and 7;
  if existing_count not in (0, 7) then
    raise exception 'Expected either no seeded lessons or all seven standard lessons';
  end if;
  if exists (
    select 1 from public.lessons l
    join (values
      (1, $lesson_text$Movement & Sequence$lesson_text$),
      (2, $lesson_text$Making Decisions with If$lesson_text$),
      (3, $lesson_text$Choosing Between Two Actions$lesson_text$),
      (4, $lesson_text$When Actions Change the Situation$lesson_text$),
      (5, $lesson_text$Repeating Instructions$lesson_text$),
      (6, $lesson_text$Repeating While Something Is True$lesson_text$),
      (7, $lesson_text$Plan, Try, and Improve$lesson_text$)
    ) expected(id, title) on expected.id = l.id
    where l.title <> expected.title
  ) then
    raise exception 'Lesson titles differ from the expected curriculum; review before applying';
  end if;
end; $lesson_guard$;

update public.lessons
set description = $lesson_text$Plan an ordered set of instructions, predict each step, and explain how a change in order can change the result.$lesson_text$,
    learning_objective = $lesson_text$Trace a short sequence from a stated starting position, write a plan that reaches a goal, and identify the first instruction that does not match the plan.$lesson_text$,
    content = $lesson_text$<div class="lesson-block">
<h3 class="lesson-block-heading">1. Your goal is to think through the instructions</h3>
<p>A program is a set of instructions. <strong>Programming logic</strong> is the reasoning used to decide which instructions are needed, what order they belong in, and why they should produce the result you want. In this lesson, the knight follows a simple sequence: one instruction after another.</p>
<p>Your job is not to guess commands until the knight reaches the exit. Your job is to explain the route before running it, then compare that prediction with what happens. You can describe a correct plan in plain words before writing any code.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">2. Separate the goal, the starting situation, and the plan</h3>
<p>A <strong>goal</strong> says what should be true at the end: the knight has reached the exit. The <strong>starting situation</strong> tells you where the knight is and what is around it. A <strong>plan</strong>, also called an algorithm, gives the ordered steps that connect that start to that goal.</p>
<ul>
<li>Goal: reach a point two movements to the right and one movement up.</li>
<li>Starting situation: all three movements in that route are clear.</li>
<li>Plan: move right, move right again, then move up.</li>
</ul>
<p>These are different pieces of information. A goal alone does not tell the knight which route to take. A plan that works from one starting position may fail from another. Always inspect the room before choosing the instructions.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">3. Read a movement as one precise action</h3>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>move(right)
move(right)
move(up)</code></pre>
<p><code>move</code> asks the knight to move. The direction inside the parentheses tells it which way: <code>up</code>, <code>down</code>, <code>left</code>, or <code>right</code>. Here, the directions are fixed directions on the screen, not instructions to turn the knight first.</p>
<p>The three lines form a <strong>sequence</strong>. In this simple program, the first move happens before the second, and the second happens before the third. The knight does not understand the intended route unless your instructions describe it. A blocked move does not mean the game will invent a detour for you.</p>
<p>Use the game command spelling when typing. The important idea, however, is the relationship between an instruction and its result, not memorizing parentheses.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">4. Trace the program one instruction at a time</h3>
<p>To <strong>trace</strong> means to follow the program slowly and record what changes. For this paper example, count successful movement actions from the start. This is a reasoning model, not a claim that every drawn floor tile equals one game movement.</p>
<ol>
<li>Before running: the knight has made no movements.</li>
<li>After line 1: it is one movement to the right of the start.</li>
<li>After line 2: it is two movements to the right of the start.</li>
<li>After line 3: it is two movements right and one movement up from the start.</li>
</ol>
<p>Notice that line 2 starts from the result of line 1. Instructions do not each start again from the original position. In the actual game, watch the distance of a movement and use the room layout to check your plan.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">5. Order can change the route</h3>
<p>Compare right, right, up with up, right, right. On an empty practice area, these can finish at the same position. That does <strong>not</strong> mean they are always interchangeable. They visit different positions on the way.</p>
<p>Suppose the space directly above the start is blocked, but the route right, right, up is clear. Starting with up now attempts a blocked movement. The same directions and the same number of instructions can produce a different journey because the order changed.</p>
<p>When comparing two plans, ask both questions: Do they finish in the same place? Can every intermediate step actually happen?</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">6. Read and predict</h3>
<p>Assume an open practice area, with no exit reached during these four moves. Predict the final position relative to the start before reading the explanation.</p>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>move(right)
move(up)
move(left)
move(up)</code></pre>
<blockquote><p><strong>Check your reasoning:</strong> Right and left cancel their horizontal change, but they still happened at different times. The two up moves remain, so the finish is two successful movements above the start. The full route matters if obstacles are added.</p></blockquote>
<p>Now change only the third line to <code>move(right)</code>. Describe each position again. Do not reuse the first answer without checking what changed.</p>
<blockquote><p><strong>Check your reasoning:</strong> The revised program finishes two movements right and two up from the start. Only one instruction changed, but the final position changed too.</p></blockquote>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">7. Find and fix a reasoning mistake</h3>
<p>The planned route is right, right, up. A student writes the following in an open practice area. Which is the first line that disagrees with the plan?</p>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>move(right)
move(up)
move(up)</code></pre>
<blockquote><p><strong>Check your reasoning:</strong> Line 1 matches the plan. Line 2 is the first mismatch: it goes up when the plan requires another right move. Replace that line with move(right), then trace all three lines again. Changing the last line alone would not fix the first wrong step.</p></blockquote>
<p>This is a <strong>logic mistake</strong>: the instructions may be understood by the game, but they describe the wrong plan. A spelling mistake is different: the game may not understand the instruction at all.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">8. Plan and write your own sequence</h3>
<p>For a clear practice route, write instructions for one up movement, two right movements, and one down movement, in that order. First say the plan aloud. Then write it. Finally, explain the expected position after each line.</p>
<blockquote><p><strong>Check your reasoning:</strong> Use move(up), move(right), move(right), then move(down), with each command on its own line. In this open-area example the finish is two movements right of the start. There are four actions even though two vertical movements cancel in the final position.</p></blockquote>
<p>Before trying a real level, check every part of that route against the actual walls. A correct answer to this small exercise is not automatically a solution to the room.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">9. A small connection to real code</h3>
<p class="code-label">Real Python example - read only; not a KnightCode command</p>
<pre><code>points = 0
points = points + 1
print(points)</code></pre>
<p>In Python, <code>points</code> is a name holding a value. The first line stores 0. The second reads the current value, adds 1, and stores the result. The third displays that value, so it displays 1. If the display line came before the addition, it would display 0 instead.</p>
<p><strong>The idea to carry over is sequence:</strong> a later instruction sees the result of earlier instructions. You do not need to memorize Python or type this example into the game.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">10. Use the idea in your levels</h3>
<ul>
<li><strong>First Steps:</strong> inspect how far one move takes the knight and count the actions needed for the straight route.</li>
<li><strong>Turn the Corner:</strong> mark the point where the direction changes. Explain why the turn belongs there.</li>
<li><strong>Tight Corridor:</strong> split the route into short sections, then join those sections in the correct order.</li>
</ul>
<p>Before Run, name the goal and predict the route. After Run, compare what happened with your trace. If they differ, find the first difference before changing the program.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">11. Explain it without looking at the example</h3>
<ul>
<li>Why does every instruction need to start from the result of the previous one?</li>
<li>Can two sequences finish in the same place but behave differently around walls?</li>
<li>What is the difference between describing the goal and giving the instructions?</li>
</ul>
<blockquote><p><strong>Check your reasoning:</strong> The position changes as the sequence runs. Different intermediate positions can meet different obstacles. A goal describes the desired result; a plan supplies the steps that make that result happen. You understand this lesson when you can explain those steps, not just copy them.</p></blockquote>
</div>
$lesson_text$
where id = 1 and title = $lesson_text$Movement & Sequence$lesson_text$;

update public.lessons
set description = $lesson_text$Use a true-or-false check to decide whether an action should run, and trace what happens when the action is skipped.$lesson_text$,
    learning_objective = $lesson_text$Distinguish a condition from an action, trace both outcomes of an if statement, and place instructions inside or outside the decision deliberately.$lesson_text$,
    content = $lesson_text$<div class="lesson-block">
<h3 class="lesson-block-heading">1. Move from a fixed plan to a checked action</h3>
<p>A sequence tells the knight what to do in order. Sometimes one instruction should run only when something is true. For example, you may want the knight to move right only when movement to the right is possible.</p>
<p>This is a <strong>decision</strong>. The program checks a question, then uses its answer to decide whether a particular action runs. You still design the plan. A condition gives the program information about the current situation; it does not work out the whole route.</p>
<p>By the end of this lesson, explain both outcomes: what happens when the answer is true, and what happens when it is false.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">2. A condition asks; an action changes something</h3>
<p><code>can(right)</code> asks whether the knight can move right from its current position. The answer is <strong>true</strong> when that movement is possible and <strong>false</strong> when it is blocked. True and false are the two possible answers to this kind of condition.</p>
<p><code>move(right)</code> is an action. It attempts movement and may change the knight's position. Checking <code>can(right)</code> does not itself move the knight.</p>
<ul>
<li>Question: can movement happen?</li>
<li>Decision: should this group of instructions run?</li>
<li>Action: perform the movement when the decision allows it.</li>
</ul>
<p>Keeping these separate prevents a common mistake: thinking that asking about a direction also sends the knight in that direction.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">3. Read a single decision</h3>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>if can(right):
    move(right)</code></pre>
<p>Read this as: <strong>If moving right is possible now, move right.</strong> The word <code>if</code> introduces the decision. The condition is <code>can(right)</code>. The colon begins the following group of instructions, and the spaces before the move show that it belongs to that group.</p>
<p>That indented group is called a <strong>block</strong>. Use four spaces in these examples. The layout matters because it shows which instructions depend on the answer. Learn to see the relationship: the movement belongs to the decision.</p>
<p>If the answer is false, the program skips this block. It does not automatically move left, wait for a door, or search for a different route.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">4. Trace both possible answers</h3>
<ol>
<li>Right is open: check can(right), obtain true, run the indented move, then continue after the block.</li>
<li>Right is blocked: check can(right), obtain false, skip the indented move, then continue after the block.</li>
</ol>
<p>In the second case, skipping the move is the correct behavior for these instructions. A skipped block does not mean the whole program has ended. It means that this particular action was not selected.</p>
<p>An <code>if</code> makes one check each time execution reaches it. It does not keep rechecking until movement becomes possible. Rechecking through repetition comes in a later lesson.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">5. Decide what belongs inside the block</h3>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>if can(right):
    move(right)
move(up)</code></pre>
<p>The right move belongs to the decision. The up move lines up with <code>if</code>, so it is outside the block. Provided execution continues, the up move is attempted after either outcome. Assume the upward move is clear from both possible positions in this example.</p>
<ol>
<li>Right open: move right, then move up.</li>
<li>Right blocked: skip moving right, then move up.</li>
</ol>
<p>Now imagine indenting the final line by four spaces as well. Both movements would belong to the same decision. When the condition is false, both would be skipped. A small change in grouping can make a large change in the plan.</p>
<p>Also, one successful check of right does not prove that a later move up is safe. A condition only answers the question you asked.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">6. Read and predict two situations</h3>
<p>Use the program below. In situation A, up is open and left is clear after moving up. In situation B, up is blocked but left is clear at the starting position. Predict the moves in each situation.</p>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>if can(up):
    move(up)
move(left)</code></pre>
<blockquote><p><strong>Check your reasoning:</strong> A: the condition is true, so the knight moves up and then left. B: the condition is false, so the knight skips up and moves left from the start. The final left instruction runs in both cases, but it starts from a different position.</p></blockquote>
<p>What would change if the left movement were inside the block?</p>
<blockquote><p><strong>Check your reasoning:</strong> In B, neither movement would run. In A, both would still run. Trace the false case to see the difference; testing only the true case would miss it.</p></blockquote>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">7. Find the wrong question</h3>
<p>A student wants to move up only when up is open. They write:</p>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>if can(right):
    move(up)</code></pre>
<p>Does an open path on the right prove that the upward path is open? Imagine right open and up blocked. Then imagine right blocked and up open.</p>
<blockquote><p><strong>Check your reasoning:</strong> No. The question and the intended action do not match. In the first situation the program selects an upward move without checking up. In the second it skips a possible upward move. For the stated goal, change the condition to can(up).</p></blockquote>
<p>A useful condition must answer a question that matters to the action or plan. Simply adding an if statement does not make a program correct.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">8. Plan and write a guarded step</h3>
<p>Write a program that attempts one left move only when left is open, then attempts one down move outside that decision. Assume down is clear from either resulting position. Before writing code, say which action depends on the condition and which does not.</p>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>if can(left):
    move(left)
move(down)</code></pre>
<p>Compare your answer with this example. Test it in your head with left open and with left blocked. Explain why down is outside the block. This explanation is more important than matching the example character for character.</p>
<p>If down is not known to be safe in a real room, inspect that part of the route or add a suitable check. Do not carry the exercise's assumptions into every level.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">9. A small connection to real code</h3>
<p class="code-label">Real Python example - read only; not a KnightCode command</p>
<pre><code>lives = 2
if lives &gt; 0:
    print(&quot;Keep playing&quot;)
print(&quot;Check finished&quot;)</code></pre>
<p>Here, <code>lives &gt; 0</code> asks whether the stored number is greater than zero. With 2 lives, both messages appear. With 0 lives, the first message is skipped and only the final message appears. The number is example data, not a KnightCode command.</p>
<p><strong>The shared logic is conditional execution:</strong> some instructions depend on an answer, while instructions outside the block continue afterwards. You are learning that relationship, not a Python spelling test.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">10. Apply it to the room, not just one move</h3>
<ul>
<li><strong>Check Before Moving:</strong> choose a direction on your planned route and explain the question before the guarded move.</li>
<li><strong>What If It Is Blocked?:</strong> predict a skipped move and describe how the later instructions continue around the obstacle.</li>
<li><strong>You Choose the Condition:</strong> match each question to the part of the route it should help with.</li>
</ul>
<p>An open direction is information about movement, not proof that the exit lies that way. Your full sequence must still reach the goal. Before each check, identify the knight's position at that point in the program.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">11. Check your reasoning</h3>
<ul>
<li>Does can(up) move the knight?</li>
<li>When an if condition is false, what happens to its block?</li>
<li>Why should you test both true and false situations?</li>
<li>Does checking one direction once guarantee that it stays open later?</li>
</ul>
<blockquote><p><strong>Check your reasoning:</strong> The check asks a question without moving. A false condition skips its block. Testing both answers reveals unwanted moves and unwanted skips. Later movement or changes in the room may change the answer, so a previous result is not a permanent promise.</p></blockquote>
</div>
$lesson_text$
where id = 2 and title = $lesson_text$Making Decisions with If$lesson_text$;

update public.lessons
set description = $lesson_text$Plan both branches of a decision, distinguish can from blocked, and explain why a possible move may still be the wrong choice.$lesson_text$,
    learning_objective = $lesson_text$Trace one selected branch of if/else, choose a safe alternative, and explain how changing the condition changes which branch runs.$lesson_text$,
    content = $lesson_text$<div class="lesson-block">
<h3 class="lesson-block-heading">1. Give the program two planned choices</h3>
<p>An <code>if</code> statement can run a block or skip it. Sometimes you need a planned action for both answers. <strong>If/else</strong> selects the if block when the condition is true and the else block when it is false.</p>
<p><code>else</code> means otherwise. It does not mean try every direction until one works. You write the alternative yourself. Your goal is to explain why each choice is appropriate for the situation that selects it.</p>
<p>This lesson adds choice to a sequence. After the chosen block finishes, execution continues with the instructions after the whole decision.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">2. State the assumptions before choosing</h3>
<p>Imagine a practice junction. Moving right is our preferred route when it is open. If right is blocked, we have already checked the map and know that up is an available alternative. These assumptions are part of the example.</p>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>if can(right):
    move(right)
else:
    move(up)</code></pre>
<p>Right open gives true, so the right move runs and the else block is skipped. Right blocked gives false, so the up move runs instead. <strong>One branch is selected</strong>, not both.</p>
<p><code>else:</code> lines up with <code>if</code>. Each movement is indented underneath its own branch. The layout tells you which result selects which instructions.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">3. Trace the two paths through the same program</h3>
<ol>
<li>Situation A: right is open. Check can(right), choose the if branch, move right, skip else, then continue.</li>
<li>Situation B: right is blocked and up is open. Check can(right), choose the else branch, move up, then continue.</li>
</ol>
<p>The program is the same in both situations. Its behavior changes because the answer to the condition changes. This is how a program can respond to different starting situations without someone manually choosing a different line each time.</p>
<p>If both directions are open, this program still chooses right. It does not choose randomly or compare which route is shorter. The preference is written into the condition and branches.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">4. Else is an alternative, not a safety check</h3>
<p>Suppose both right and up are blocked. The condition is false, so the example selects <code>move(up)</code>. But choosing that line does not make the movement possible. The else branch does not secretly test up.</p>
<p>For a real room, use a known-safe alternative or check the alternative too. One way to check it is a decision inside the else block:</p>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>if can(right):
    move(right)
else:
    if can(up):
        move(up)</code></pre>
<p>This is a <strong>nested decision</strong>: a decision inside another decision. If both directions are blocked, neither movement runs. Read the spaces carefully: the up move belongs to the inner check, and the entire inner check belongs to else.</p>
<p>You do not need nesting for every puzzle. Use it only when the plan needs another question.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">5. Ask the opposite question with blocked</h3>
<p><code>blocked(right)</code> asks whether moving right is blocked now. In the same unchanged situation, it gives the opposite answer to <code>can(right)</code>. It checks movement rules, not just whether a tile looks like a wall.</p>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>if blocked(right):
    move(up)
else:
    move(right)</code></pre>
<p>Under our earlier assumption that up is a safe detour, this makes the same choice as the first example. When right is blocked, it chooses up. When right is open, it chooses right.</p>
<p>Notice that we changed the question <strong>and swapped the branch actions</strong>. Changing can to blocked without changing the branches would reverse the intended choice. Always translate the whole decision into plain words.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">6. Read and predict the continuation</h3>
<p>Assume the last left move is possible after either branch and no exit ends execution early. Predict the full sequence when up is open, then when up is blocked but right is open.</p>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>if can(up):
    move(up)
else:
    move(right)
move(left)</code></pre>
<blockquote><p><strong>Check your reasoning:</strong> Up open: up, then left. Up blocked: right, then left. The final left move is outside both branches, so it is attempted after the selected branch. In an open practice area, the second route returns to its starting horizontal position.</p></blockquote>
<p>Why does the knight not run the right move after the up move in the first situation?</p>
<blockquote><p><strong>Check your reasoning:</strong> They belong to different branches of one if/else decision. Once the true branch is selected, the else branch is skipped.</p></blockquote>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">7. Find and fix reversed logic</h3>
<p>The intention is: if right is blocked, take a known-open upward detour; otherwise go right. A student writes:</p>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>if blocked(right):
    move(right)
else:
    move(up)</code></pre>
<p>Trace the blocked case before changing anything. Which instruction does it select? Does that match the intention?</p>
<blockquote><p><strong>Check your reasoning:</strong> When right is blocked, the condition is true and the program selects the right move. That contradicts the plan. Swap the branch actions: up belongs in the true branch and right belongs in else. Then check the open case too.</p></blockquote>
<p>Do not judge a condition by whether it contains a familiar word. Judge it by which action its true answer selects.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">8. Plan your own preference</h3>
<p>At a practice junction, prefer left if it is possible. Otherwise, use a known-clear downward path. Write the decision, then explain what happens when both paths are open and when only down is open.</p>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>if can(left):
    move(left)
else:
    move(down)</code></pre>
<blockquote><p><strong>Check your reasoning:</strong> Both open: left is selected because it is the written preference. Only down open: the condition is false, so down is selected. If neither is open, the assumption about a safe alternative fails; this version does not solve that situation.</p></blockquote>
<p>A useful explanation includes the limits of the plan. Saying when a solution does not work is part of understanding it.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">9. A small connection to real code</h3>
<p class="code-label">Real Python example - read only; not a KnightCode command</p>
<pre><code>score = 6
if score &gt;= 5:
    print(&quot;Goal reached&quot;)
else:
    print(&quot;Keep practising&quot;)</code></pre>
<p>The condition asks whether score is at least 5. With 6, only the first message appears. With 3, only the second appears. With exactly 5, the first appears because the check includes equality.</p>
<p><strong>The shared idea is choosing one branch from two.</strong> The number check is different from a path check, but the decision structure is the same. You do not need Python syntax to explain the two possible outcomes.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">10. Practise decisions in your levels</h3>
<ul>
<li><strong>Right or Up?:</strong> state which direction your decision prefers and why that helps the route.</li>
<li><strong>When the Answer Is No:</strong> explain the alternative before running the false case.</li>
<li><strong>Is It Blocked?:</strong> translate blocked into a yes-or-no question and check which branch true selects.</li>
<li><strong>Looks Can Be Misleading:</strong> distinguish a tile's appearance from whether movement is actually allowed.</li>
</ul>
<p>A condition tests a local fact. It does not tell you whether a direction eventually reaches the exit. After choosing a branch, continue tracing the rest of the room.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">11. Check your reasoning</h3>
<ul>
<li>Why does else not guarantee a safe movement?</li>
<li>How can both paths be open while only one branch runs?</li>
<li>What must change when you replace can with blocked but want the same choice?</li>
</ul>
<blockquote><p><strong>Check your reasoning:</strong> Else selects the action you supplied without another automatic check. The condition determines the chosen branch even when both paths are possible. Reversing the question requires reversing the branch actions if you want to preserve the same behavior.</p></blockquote>
</div>
$lesson_text$
where id = 3 and title = $lesson_text$Choosing Between Two Actions$lesson_text$;

update public.lessons
set description = $lesson_text$Track how actions change the room, identify what must happen first, and keep required conditions true while completing the plan.$lesson_text$,
    learning_objective = $lesson_text$Explain a room state before and after an action, order dependent steps, and distinguish a lasting button effect from a pressure plate that must stay held.$lesson_text$,
    content = $lesson_text$<div class="lesson-block">
<h3 class="lesson-block-heading">1. A correct route can depend on changing the room</h3>
<p>So far, you have planned movements and checked paths. Some rooms need more: a passage is closed until a button is pressed, or a door stays open only while a plate is held. You must reason about how your actions change what can happen next.</p>
<p>The programming idea is <strong>state</strong>: the facts that describe the situation at a particular moment. In KnightCode, these facts include the knight's position, the crate's position, whether a plate is held, and whether a door is open. State is a useful name for these facts, not a new command to type.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">2. Describe the before and after</h3>
<p>Imagine an ordinary button that opens a door. Before the knight reaches it, the button has not been activated and the door is closed. After the knight activates it, the door is open. The action changed the state of the room.</p>
<ol>
<li>Before: door closed; the planned crossing is blocked.</li>
<li>Action: reach and activate the button.</li>
<li>After: door open; the crossing can now be considered.</li>
</ol>
<p>A <strong>condition</strong> reads something about the current state. An <strong>action</strong> may change that state. This means the same question can have a different answer before and after an action. Do not assume an earlier check is still true later.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">3. Work out what must happen first</h3>
<p>A <strong>dependency</strong> means one step needs another step to happen first. If crossing a passage requires an open door, and opening the door requires pressing a button, pressing the button must come before crossing.</p>
<p>Plan backwards from the goal: I need to reach the exit. What prevents that? A closed door. What opens it? The button. How do I reach the button? This gives you a useful order instead of a list of unrelated movements.</p>
<p>Then trace forwards to test it. Working backwards helps discover the steps; working forwards checks that each step is possible from the situation left by the previous one.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">4. Trace an action followed by a check</h3>
<p>For this small example only, suppose one right move activates an ordinary button. Once pressed, it opens the passage directly above the knight's new position. Both movements have been checked against this imagined layout.</p>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>move(right)
if can(up):
    move(up)</code></pre>
<ol>
<li>Move right onto the button. This changes the room.</li>
<li>At the new position, check the upward passage.</li>
<li>If that movement is now possible, move up.</li>
</ol>
<p>Checking up before the right move would ask about the old position and old room state. Even the same direction name can refer to a different neighboring space after movement. Explain where and when a check happens, not just which word it contains.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">5. Distinguish a lasting change from a held condition</h3>
<ul>
<li><strong>Ordinary button:</strong> once activated, its linked door stays open when the activating object leaves.</li>
<li><strong>Pressure plate:</strong> its linked door stays open only while an allowed object remains on the plate. When nothing holds it, the door closes.</li>
</ul>
<p>A pressure plate is not simply an ordinary button with a short timer. What matters is whether it is still held. Standing on a plate can make the door open now without guaranteeing that the door will be open when you reach it.</p>
<p>Ask two different questions: Is the route open at this moment? Will the action I take next keep it open? The second question is what makes the plan reliable.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">6. Use a crate to keep a required fact true</h3>
<p>The knight pushes a crate by moving toward it. There is no separate push command in these lessons. The crate needs space to move into; a crate blocked against a wall cannot simply be pushed through it.</p>
<p>For a plate that accepts crates, leaving the crate on the plate can keep the door open while the knight leaves. Some switches have different activation rules, so inspect the level rather than assuming every object can activate every switch.</p>
<ol>
<li>Reach the correct side of the crate.</li>
<li>Push it onto the intended crate-sensitive plate.</li>
<li>Leave it there while the knight takes the opened route.</li>
</ol>
<p>Throughout the crossing, the required fact is: <strong>the plate remains held</strong>. You may hear this described as a condition that must stay true. The reasoning matters more than the term. Moving the crate again can undo the useful state.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">7. Read and predict a state change</h3>
<p>In this thought exercise, one pressure plate controls one door. The plate accepts the knight and crates. At first it is empty. Predict the door after each step: the knight steps onto it; the knight leaves with no crate there; a crate is placed on it; the knight walks away while the crate stays.</p>
<blockquote><p><strong>Check your reasoning:</strong> The door opens when the knight holds the plate, closes when the empty plate is released, opens when the crate holds it, and stays open when the knight leaves but the crate remains. The important fact is occupancy of the plate, not how many times the knight visited it.</p></blockquote>
<p>Change the assumption: the plate does not respond to crates. Would the last two outcomes still follow?</p>
<blockquote><p><strong>Check your reasoning:</strong> No. The proposed support object must be one the switch accepts. A plan is only as good as the facts it assumes.</p></blockquote>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">8. Find and fix a dependency mistake</h3>
<p>A student plans: stand on a pressure plate, walk away from it, then cross its linked door. Nothing else will hold the plate. Explain the first step that breaks the condition needed for crossing.</p>
<blockquote><p><strong>Check your reasoning:</strong> Walking away releases the plate and closes the door. The later crossing fails because the earlier action removed the condition it needed. If a suitable crate and route are available, revise the plan so the crate holds the plate before the knight leaves.</p></blockquote>
<p>Do not fix this by blindly adding extra movement near the door. The problem is the state of the mechanism, not necessarily the final direction. Trace the cause of the closed door.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">9. Plan and explain a multi-step solution</h3>
<p>For a room with a crate-sensitive plate and an exit behind its door, write a plain-language plan before choosing movements. Include the side from which to push the crate and the path the knight will take after placing it.</p>
<p>Beside each step, write two short notes: <strong>needs</strong> and <strong>changes</strong>. For example: pushing needs a clear destination; pushing changes the crate position. Crossing needs an open door; crossing changes the knight position.</p>
<blockquote><p><strong>Check your reasoning:</strong> A sound plan checks that the crate can reach the plate, the knight can leave it there, and the exit route stays open. Exact movement commands depend on the room. There is no single direction sequence that solves every arrangement.</p></blockquote>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">10. A small connection to real code</h3>
<p class="code-label">Real Python example - read only; not a KnightCode command</p>
<pre><code>plate_held = True
print(plate_held)
plate_held = False
print(plate_held)</code></pre>
<p>This Python example stores a fact using the name <code>plate_held</code>. It first displays True, then changes the stored fact and displays False. This does not operate a real KnightCode door; it is a tiny model of changing information.</p>
<p><strong>The shared logic is tracking state over time.</strong> A fact can change, and a later check must use the current situation. You do not need to create variables in the KnightCode terminal to practise that reasoning.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">11. Practise with your mechanisms</h3>
<ul>
<li><strong>Open the Way:</strong> identify the button action that must happen before the crossing.</li>
<li><strong>Keep It Open:</strong> explain what holds the plate after the knight moves away.</li>
<li><strong>Multi-Door Vault:</strong> list which mechanism affects which passage, then order the dependencies.</li>
</ul>
<p>Before running, explain not only where the knight goes but what changes in the room. After running, look for the first state change that differed from your prediction.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">12. Check your reasoning</h3>
<ul>
<li>Why can a condition have a different answer after a movement?</li>
<li>Why is a currently open door not always safe to plan around?</li>
<li>What must remain true while crossing a pressure-plate-controlled route?</li>
</ul>
<blockquote><p><strong>Check your reasoning:</strong> Movement can change position and activate or release mechanisms. An action may close a route that was open a moment ago. The needed plate must remain held by an allowed object until the plan no longer depends on that door.</p></blockquote>
</div>
$lesson_text$
where id = 4 and title = $lesson_text$When Actions Change the Situation$lesson_text$;

update public.lessons
set description = $lesson_text$Identify a repeated group of actions, choose a fixed repetition count, and separate repeated steps from steps that happen once.$lesson_text$,
    learning_objective = $lesson_text$Expand a repeat loop into its full action sequence, count actions separately from repetitions, and correct misplaced instructions or an incorrect count.$lesson_text$,
    content = $lesson_text$<div class="lesson-block">
<h3 class="lesson-block-heading">1. Find a pattern before choosing a loop</h3>
<p>Some routes contain the same action or group of actions several times. A <strong>loop</strong> is a way to repeat a group without writing that group out each time. This lesson uses <code>repeat</code> when the number of repetitions is known.</p>
<p>The goal is not to make every program as short as possible. The goal is to recognize a pattern, express it clearly, and keep the intended behavior. A shorter program that takes the wrong route is not an improvement.</p>
<p>First describe the complete route. Then ask: which part is exactly repeated, and how many copies of that part are needed?</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">2. Replace repeated instructions with a count</h3>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>move(right)
move(right)
move(right)</code></pre>
<p>Assume all three movements are possible and the level does not end during them. This sequence performs the same action three times. We can express that repeated part as:</p>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>repeat(3):
    move(right)</code></pre>
<p>The number 3 is the <strong>repetition count</strong>. The indented line is the loop body: the instruction that runs on each repetition. After the third repetition, execution continues after the loop.</p>
<p>The knight still performs three moves. The loop saves repeated writing, not physical movement. It also does not automatically check whether a wall is in the way.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">3. Expand the loop to check your reasoning</h3>
<p>One pass through the body is called an <strong>iteration</strong>, or simply a repetition. Trace repeat(3) by numbering the passes:</p>
<ol>
<li>First repetition: run move(right).</li>
<li>Second repetition: run move(right) again, from the new position.</li>
<li>Third repetition: run move(right) again, then finish the loop.</li>
</ol>
<p>To check a loop, mentally replace it with the full sequence it represents. If that expanded sequence does not match the route, the loop does not match either. This is a useful way to test your logic without relying on how compact the code looks.</p>
<p>In the game, a level finishing or a program being stopped can end execution early. The trace here describes normal completion of the example.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">4. A repeated group can contain more than one action</h3>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>repeat(2):
    move(right)
    move(up)</code></pre>
<p>Both indented instructions belong to the body. Each repetition performs right and then up. The expanded order is right, up, right, up. It is not right, right, up, up.</p>
<p>Two repetitions of a two-action body produce four movement actions. Keep these quantities separate: <strong>number of passes</strong> and <strong>number of actions inside each pass</strong>.</p>
<p>A block is repeated as a unit, but instructions within it still run in order. A loop does not remove the sequence rules you already learned.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">5. Place one-time actions outside the loop</h3>
<p>Imagine a clear route requiring three right movements and then one up movement. The turn should happen once, after the repeated section.</p>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>repeat(3):
    move(right)
move(up)</code></pre>
<p>Because up lines up with repeat, it is outside the loop. The route is right, right, right, up. If you indent up inside the body, the route becomes right, up, right, up, right, up. That describes a different pattern.</p>
<p>Before writing a loop, label each part of your plan as <strong>repeated</strong> or <strong>once afterwards</strong>. Indentation should reflect that decision.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">6. Read and predict the full sequence</h3>
<p>Assume every move is possible. Write the expanded sequence and count the movements before reading the answer.</p>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>repeat(2):
    move(up)
    move(right)
move(down)</code></pre>
<blockquote><p><strong>Check your reasoning:</strong> The sequence is up, right, up, right, down: five movement actions. The body contributes four actions across two repetitions. Down contributes one more after the loop. The final position is two movements right and one up from the start in this open-area example.</p></blockquote>
<p>What changes if the count becomes 3?</p>
<blockquote><p><strong>Check your reasoning:</strong> The pair runs three times, producing six body movements, then down runs once: seven movements in total. The change affects the whole repeated group, not just its first line.</p></blockquote>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">7. Find and fix a misplaced turn</h3>
<p>The intention is right, right, right, then up once. A student writes:</p>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>repeat(3):
    move(right)
    move(up)</code></pre>
<p>Which part of the written program makes the route disagree with the intention? Expand it rather than guessing a different count.</p>
<blockquote><p><strong>Check your reasoning:</strong> The up move is inside the repeated body, so it happens three times. Move that line outside the block. Changing only the repetition count cannot produce three right moves and one up move from this two-action body.</p></blockquote>
<p>This is a grouping mistake. Other loop mistakes involve the wrong count or the wrong action. Identify which kind of mismatch you have before editing.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">8. Plan and write a repeated pattern</h3>
<p>For an open practice route, express left, down, left, down, left, down, then right once using a loop. Name the smallest repeated group before you write it.</p>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>repeat(3):
    move(left)
    move(down)
move(right)</code></pre>
<blockquote><p><strong>Check your reasoning:</strong> The repeated group is left followed by down. It occurs three times. Right is outside the loop because it happens once afterwards. There are seven movement actions in the expanded plan.</p></blockquote>
<p>Now imagine an obstacle blocks the second downward move. The pattern is easy to describe, but it no longer gives a clear route. A repeat count is a plan, not proof that all its actions can succeed. Check each repetition at its new position.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">9. Decide whether a fixed count is appropriate</h3>
<p>Use repeat when you know both the body and the required count. A measured three-step section is a good candidate. A route where you only know "keep going until movement is blocked" needs a different kind of reasoning, which the next lesson introduces.</p>
<p>Two programs can also be equally clear without both using loops. A short sequence of unrelated turns may be easier to explain directly. Do not force different actions into a pattern that is not really there.</p>
<p>When you claim that two versions are equivalent, explain that they perform the same ordered actions under the same starting conditions. Comparing line counts alone is not enough.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">10. A small connection to real code</h3>
<p class="code-label">Real Python example - read only; not a KnightCode command</p>
<pre><code>for step in range(3):
    print(&quot;Check the next item&quot;)
print(&quot;Finished&quot;)</code></pre>
<p>This Python loop displays the first message three times, then displays Finished once. The name <code>step</code> is used by Python to track the repetitions; you do not need to use it inside this example.</p>
<p><strong>The shared idea is a fixed number of passes through a block.</strong> Python writes that idea differently from KnightCode. Focus on what repeats, how often, and what happens afterwards, rather than memorizing the language form.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">11. Use repetition in your levels</h3>
<ul>
<li><strong>Do It Again:</strong> find the right-and-up pattern, count its repetitions, and trace the position after each pair.</li>
<li><strong>Repeat, Then Turn:</strong> separate the repeated approach from the turn, button action and remaining route.</li>
</ul>
<p>Before Run, expand the loop aloud or on paper. After Run, compare the movement pattern. If it differs, inspect the body and count separately. A loop that finishes is not necessarily a loop that reaches the goal.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">12. Check your reasoning</h3>
<ul>
<li>What is the difference between a repetition and a movement action?</li>
<li>Why does moving a line outside a loop change how often it runs?</li>
<li>Does shorter code always mean fewer game movements?</li>
</ul>
<blockquote><p><strong>Check your reasoning:</strong> One repetition runs the entire body, which may contain several actions. An outside line runs after the loop rather than on each pass. A loop can shorten the written program while keeping exactly the same movement sequence.</p></blockquote>
</div>
$lesson_text$
where id = 5 and title = $lesson_text$Repeating Instructions$lesson_text$;

update public.lessons
set description = $lesson_text$Use a condition to decide whether to repeat, trace every new check, and explain what will eventually make the loop stop.$lesson_text$,
    learning_objective = $lesson_text$Trace zero, one and several while-loop repetitions; distinguish while from if and repeat; and identify a loop whose actions do not lead toward stopping.$lesson_text$,
    content = $lesson_text$<div class="lesson-block">
<h3 class="lesson-block-heading">1. Let the situation decide whether to continue</h3>
<p><code>repeat</code> uses a count you choose in advance. A <strong>while loop</strong> asks a condition before each pass through its body. If the answer is true, it runs the body and checks again. If the answer is false, it leaves the loop.</p>
<p>This fits a plan such as "keep moving right while moving right is possible." You may not need to count the corridor first, but you still need to understand where the loop stops and what happens afterwards.</p>
<p>Your learning goal is to explain the repeated decision. A while loop is not a command that automatically solves an unknown room.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">2. Read the check-action-check cycle</h3>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>while can(right):
    move(right)</code></pre>
<ol>
<li>Check can(right) from the current position.</li>
<li>If true, run move(right).</li>
<li>Return to the condition and check it from the resulting position.</li>
<li>If false, skip the body and continue after the loop.</li>
</ol>
<p>The check happens before the movement, including before the first one. The program does not move once just to find out whether it can move. The action changes the position, so the next check can produce a different answer.</p>
<p>The indented instructions are the body, just as with repeat. Every pass through the body follows its own sequence in order.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">3. Trace a short corridor</h3>
<p>Imagine a clear straight corridor with exactly three successful right movements available before a wall blocks the next movement. Assume no exit or other event ends execution during this example.</p>
<ol>
<li>Check 1 is true. Move right for the first time.</li>
<li>Check 2 is true from the new position. Move right for the second time.</li>
<li>Check 3 is true. Move right for the third time.</li>
<li>Check 4 is false at the blocked end. Do not move right again; leave the loop.</li>
</ol>
<p>There were <strong>three movements and four checks</strong>. The final false check is how the loop discovers that another pass should not happen. Count checks separately from actions when tracing a while loop.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">4. Include the case where the body never runs</h3>
<p>Now put the knight where right is already blocked. The first check is false. The loop body runs zero times, and execution continues after the loop.</p>
<p>This is not an error. It is the expected result of checking before acting. A useful test set includes zero repetitions, one repetition, and several repetitions. Each tells you something different about the plan.</p>
<p>If the body contains an action that your later plan always requires, ask whether it is safe for that action to be skipped completely. Sometimes that action belongs before or after the loop instead.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">5. Compare if, repeat and while</h3>
<ul>
<li><strong>if can(right):</strong> checks once when reached and may perform its body once.</li>
<li><strong>repeat(3):</strong> plans three passes through its body without using a path condition to choose the count.</li>
<li><strong>while can(right):</strong> checks before every pass and keeps repeating only while its condition remains true.</li>
</ul>
<p>On a corridor with exactly three available moves, repeat(3) and the simple rightward while loop can produce the same movements. If the corridor length changes, the fixed count stays three while the condition-controlled loop may perform a different number.</p>
<p>That does not make while always better. Choose according to the goal: "exactly three" and "as far as possible" are different requirements.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">6. Continue after the loop deliberately</h3>
<p>Suppose the corridor ends at a wall and an upward opening is available at that endpoint. The following program separates following the corridor from checking the turn.</p>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>while can(right):
    move(right)
if can(up):
    move(up)</code></pre>
<p>The if statement lines up with while, so it is outside the loop. It is reached after the rightward loop ends. The upward check is made at the final position, not after every right move.</p>
<p>If an upward side passage appears halfway along the corridor while right is still open, this simple while loop passes it. It checks only right. The stopping rule must match the part of the route you actually want.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">7. Read and predict different starting situations</h3>
<p>Use the previous program. In A, two right moves lead to a wall and up is open there. In B, right is blocked immediately and up is open at the start. In C, right and up are both blocked at the start. Predict the actions.</p>
<blockquote><p><strong>Check your reasoning:</strong> A: right, right, then up. B: the loop runs zero times, then the if selects up. C: the loop runs zero times and the if block is skipped, so neither movement runs. The same program responds differently because the checked facts differ.</p></blockquote>
<p>In A, how many times is the rightward condition checked?</p>
<blockquote><p><strong>Check your reasoning:</strong> Three times: two true answers allow the two moves, and a final false answer ends the loop. The upward condition is a separate check.</p></blockquote>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">8. Find a loop that cannot make progress</h3>
<p>Imagine two adjacent open positions. The starting position has a clear path to its right. Both moves below succeed, and nothing else in the room changes:</p>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>while can(right):
    move(right)
    move(left)</code></pre>
<p>Trace one full pass. Where does it finish? What answer will the next condition get?</p>
<blockquote><p><strong>Check your reasoning:</strong> The body returns the knight to the starting position. Right is still open, so another pass repeats the same situation. The plan does not move toward making the condition false. The game may stop it with a safety limit, but that limit is not a correct solution.</p></blockquote>
<p>If the intention was to reach the right-hand wall, remove the move that undoes the progress. Then explain why each successful right movement brings the knight closer to the blocked endpoint. Do not rely on a program being stopped for you.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">9. Plan and justify a stopping rule</h3>
<p>Write a program that follows an upward corridor while movement is possible, then attempts one right move only if right is open. Assume following the whole corridor is the intended first part of the route.</p>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>while can(up):
    move(up)
if can(right):
    move(right)</code></pre>
<p>Explain three things before running: what is checked repeatedly, what changes inside the loop, and what makes it stop. Then trace the case where up is blocked at the start.</p>
<blockquote><p><strong>Check your reasoning:</strong> The loop checks upward movement; its body changes the position upward; the blocked end eventually makes the condition false. If blocked initially, it performs no upward moves and immediately reaches the separate rightward check.</p></blockquote>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">10. A small connection to real code</h3>
<p class="code-label">Real Python example - read only; not a KnightCode command</p>
<pre><code>items_left = 3
while items_left &gt; 0:
    print(items_left)
    items_left = items_left - 1
print(&quot;Finished&quot;)</code></pre>
<p>This Python program displays 3, 2, 1, then Finished. Each repetition reduces the stored count. Once the count reaches 0, the next condition is false. If the subtraction were removed, the value would stay 3 and the condition would stay true.</p>
<p><strong>The shared reasoning is termination:</strong> explain how the body moves the situation toward stopping. The subtraction is Python example code, not a command to enter in KnightCode.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">11. Practise on your routes</h3>
<ul>
<li><strong>Keep Going:</strong> identify the corridor's stopping point and the remaining route after it.</li>
<li><strong>Check Again:</strong> explain how each movement changes where the next check happens.</li>
<li><strong>Stop, Then Turn:</strong> keep the loop, button visit and final turn in the order the room needs.</li>
</ul>
<p>Use the room rather than a guessed count to justify a while condition. Test the planned endpoint: stopping safely at the wrong location still leaves the goal unsolved.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">12. Check your reasoning</h3>
<ul>
<li>Can a while body run zero times?</li>
<li>Why can three successful moves need four checks?</li>
<li>What is wrong with a loop that always returns to the same unchanged situation?</li>
</ul>
<blockquote><p><strong>Check your reasoning:</strong> Yes: its first condition can be false. The extra check discovers that a fourth move should not happen. An unchanged situation can keep the condition true forever, so the plan needs an action that genuinely leads toward its intended stopping condition.</p></blockquote>
</div>
$lesson_text$
where id = 6 and title = $lesson_text$Repeating While Something Is True$lesson_text$;

update public.lessons
set description = $lesson_text$Combine sequences, decisions, loops and changing room states into a reasoned solution, then test and improve it using evidence.$lesson_text$,
    learning_objective = $lesson_text$Break a puzzle into smaller goals, trace a combined plan, diagnose the first mismatch, and justify a correction without changing the intended result.$lesson_text$,
    content = $lesson_text$<div class="lesson-block">
<h3 class="lesson-block-heading">1. Solve the problem before choosing commands</h3>
<p>You now have several tools: sequences for order, conditions for decisions, loops for repetition, and state reasoning for changes in the room. This lesson is about choosing and combining them to solve a complete problem.</p>
<p>The target is not a program containing every command. The target is a plan you can explain: what must happen, why the steps are possible, how the program chooses or repeats them, and how you know the goal is reached.</p>
<p>A clear short sequence can be better than an unnecessary loop. A condition is useful when the plan needs a check, not simply because the command is available.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">2. Understand the room as a set of facts</h3>
<p>Before typing, identify the start, exit, blocked passages, mechanisms and movable objects. Separate what you know from what you still need to test. For example, a wall-looking panel may not behave like a solid wall.</p>
<ul>
<li><strong>Goal:</strong> what must be true when the solution finishes?</li>
<li><strong>Available actions:</strong> what can the knight do with the commands taught so far?</li>
<li><strong>Constraints:</strong> which passages are blocked, and which objects must remain in place?</li>
<li><strong>Unknowns:</strong> which movement or mechanism behavior needs checking?</li>
</ul>
<p>An assumption is something the plan takes as true. State it explicitly. "The crate can be pushed onto the plate from this side" is an assumption you can inspect and test.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">3. Break the goal into smaller goals</h3>
<p>Dividing a problem into manageable parts is called <strong>decomposition</strong>. For an exit controlled by a crate-sensitive plate, the smaller goals might be:</p>
<ol>
<li>Reach the side of the crate needed for the push.</li>
<li>Place the crate on the correct plate.</li>
<li>Leave the crate there and reach the opened passage.</li>
<li>Cross the passage and reach the exit.</li>
</ol>
<p>These parts are connected. The second needs a reachable pushing position. The third needs the plate held. The last needs the door open. Write these dependencies before translating the plan into directions.</p>
<p>After each part, describe the expected state: knight position, crate position and door status. Those checkpoints help you locate a mistake later.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">4. Choose the structure that fits each part</h3>
<ul>
<li><strong>Sequence:</strong> several different actions must happen in a specific order.</li>
<li><strong>If or if/else:</strong> the next action depends on a true-or-false answer.</li>
<li><strong>Repeat:</strong> a known action group occurs a known number of times.</li>
<li><strong>While:</strong> keep performing a group while a condition remains true.</li>
</ul>
<p>A complete room can use several of these, but it does not have to use all of them. Explain the reason for each structure you choose. "I used repeat because this same pair occurs twice" is a reason. "I used repeat because the lesson mentions it" is not enough.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">5. Trace a combined program</h3>
<p>For this practice example, assume two right moves are clear. After them, up is open; right remains open after moving up. No goal ends the program early. Predict the full route:</p>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>repeat(2):
    move(right)
if can(up):
    move(up)
else:
    move(down)
move(right)</code></pre>
<ol>
<li>The loop performs right twice, changing the starting position for the decision.</li>
<li>The upward check is true in the stated situation, so up runs and down is skipped.</li>
<li>The final right move is outside the decision, so it runs afterwards.</li>
</ol>
<blockquote><p><strong>Check your reasoning:</strong> The action sequence is right, right, up, right. If up were blocked after the loop and down were clear, the sequence would instead be right, right, down, right. The final right move would also need to be possible from that alternate position.</p></blockquote>
<p>This is a small example of combining structures, not a full solution for your final game room. Map each part of your actual plan to the actual layout.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">6. Test a prediction, not just a final score</h3>
<p>Before Run, write an expected result at each checkpoint. During the run, observe what actually happens. Afterwards, compare the two. A failed attempt is useful when it gives you evidence about which assumption or instruction was wrong.</p>
<p>A simple test note can be: expected the crate to stay on the plate; observed it move off during the last push; therefore the door closed before the crossing. This explanation points to a specific correction.</p>
<p>Also check starting conditions. A retry from a changed room may not be comparable to an earlier attempt. If you want to compare two program versions, make sure they start from the same intended setup.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">7. Find the first mismatch</h3>
<p><strong>Debugging</strong> means locating and correcting the cause of unwanted behavior. Start with the earliest point where your prediction and the actual run differ, not merely the place where the knight finally gets stuck.</p>
<ul>
<li>Was the instruction understood? Check command spelling and grouping if execution cannot begin.</li>
<li>Did the selected action match the plan? Check directions and branch choices.</li>
<li>Did a repeated group run too often or include a one-time action?</li>
<li>Did an earlier action remove a condition needed later, such as a held plate?</li>
</ul>
<p>Change one relevant part, predict its effect, and test again. Changing several unrelated things at once makes it harder to explain which change helped.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">8. Find and fix a combined logic mistake</h3>
<p>The intended route is two right moves, then one upward move only if up is possible. A student writes:</p>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>repeat(2):
    move(right)
    if can(up):
        move(up)</code></pre>
<p>Assume up is open after each right move. Expand the program. Does it match the intention?</p>
<blockquote><p><strong>Check your reasoning:</strong> It produces right, up, right, up. The decision belongs to the repeated body, so it is reached twice. Move the whole if block outside repeat, keeping its move indented under if. The corrected structure is shown below.</p></blockquote>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>repeat(2):
    move(right)
if can(up):
    move(up)</code></pre>
<p>The correction changes when the decision happens. Explain that relationship rather than saying only that some spaces were removed.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">9. Improve only after preserving correctness</h3>
<p>Suppose a working sequence contains right, up, right, up. Replacing it with repeat(2) around right and up can make the repeated pattern clearer. Verify it by expanding the new version and comparing the ordered actions.</p>
<p>Do not assume that fewer written lines always mean fewer attempts, less movement, or a better route. These are different measures. A useful improvement either makes the plan easier to understand or improves a chosen result while still reaching the goal correctly.</p>
<p>For a mechanism puzzle, also compare state changes. A route that reaches the same position but releases a necessary plate is not equivalent to one that keeps it held.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">10. A small connection to real code</h3>
<p class="code-label">Real Python example - read only; not a KnightCode command</p>
<pre><code>total = 0
for value in [2, 4, 1]:
    if value &gt; 1:
        total = total + value
print(total)</code></pre>
<p>This Python example visits three numbers in order. It adds a number only if it is greater than 1. Starting at 0, the total becomes 2, then 6, then stays 6 when 1 is skipped. The final display is 6.</p>
<p>The names hold information, the loop repeats, the condition chooses, and the addition changes the state. <strong>The same tracing method works outside the game.</strong> You are not expected to learn Python lists here; follow the stated three values and explain each decision.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">11. Build and explain your own room solution</h3>
<ol>
<li>State the goal and important starting facts.</li>
<li>Write smaller goals and the order they depend on.</li>
<li>Choose movements, decisions or loops for each part.</li>
<li>Predict position and mechanism state at checkpoints.</li>
<li>Run, compare, and identify the first mismatch.</li>
<li>Correct the cause and explain why the revision helps.</li>
</ol>
<p>In <strong>Find and Fix</strong>, check whether the plate is held before the plan depends on its door. In <strong>Your KnightCode Challenge</strong>, combine the repeated approach, crate placement and exit route according to the room you see. Avoid copying a practice snippet as if it were the whole answer.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">12. Show that you understand the logic</h3>
<p>After solving a room, explain your program to someone who cannot see your code. Include why each decision is needed, what each loop repeats, what stops it, and which facts must remain true.</p>
<ul>
<li>If a path became blocked, which part of your plan would need reconsidering?</li>
<li>Which test showed you the first mistake?</li>
<li>What did you change, and why did that change address the cause?</li>
<li>Can you describe the same plan in plain words without the game command spelling?</li>
</ul>
<blockquote><p><strong>Check your reasoning:</strong> A strong explanation connects actions to results and evidence to corrections. Reaching the exit demonstrates one successful run. Explaining the plan, its assumptions and its limits shows the programming logic behind that run.</p></blockquote>
</div>
$lesson_text$
where id = 7 and title = $lesson_text$Plan, Try, and Improve$lesson_text$;

commit;
