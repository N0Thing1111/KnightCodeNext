-- KnightCode curriculum: original level definitions plus the revised programming-logic lessons.
-- Safe to rerun: stable IDs are upserted.

insert into public.lessons(id,title,description,learning_objective,content,order_number,active) values
  (1,$kc$Movement & Sequence$kc$,$kc$Learn sequence through Python inputs, calculations and output, then apply the same ordered reasoning to the knight's route and a purchase activity.$kc$,$kc$Trace values and movements in order; read whole-number inputs, calculate with variables and print results in Python; explain why each step must follow the previous one.$kc$,$kc$<div class="lesson-block">
<h3 class="lesson-block-heading">1. Programming logic: choose the steps and their order</h3>
<p>Programming logic is the reasoning behind a solution: what information is needed, which steps change it, and why those steps reach the goal. An <strong>algorithm</strong> is that step-by-step plan. Python is the language we will use to express and test the plan. In the game, you apply the same reasoning to movement commands.</p><p>Start with the information given, write the steps in order, predict the result, then compare your prediction with a run. Correct spelling matters, but understanding why the steps work is the learning goal. You should be able to explain both a route and a calculation without guessing.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">2. Variables remember the current values</h3>
<p>A <strong>variable</strong> is a name that refers to a value. In <code>length = 8</code>, the equals sign assigns 8 to length. It does not ask whether two things are equal. Later lines can use that stored value. Names must be written consistently: <code>length</code> and <code>Length</code> are different names.</p><p class="code-label">Python example - use the Python editor, not the game terminal</p><pre><code>length = 8
pieces = 3
used = length * pieces
print(used)</code></pre><p class="code-label">Output</p><pre><code>24</code></pre><p>Trace the sequence: length becomes 8, pieces becomes 3, and used becomes 24. The <code>*</code> operator means multiplication. <code>print(used)</code> displays the value of used. <code>print("used")</code> would display the word used because quotation marks describe text, called a string.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">3. Read input, process it, then display output</h3>
<p><code>input()</code> reads one answer as text. <code>int(input())</code> converts that text to a whole number so arithmetic can use it. Enter valid whole numbers such as 3, without currency signs or extra words. Each call reads the next answer, so input order is part of the plan.</p><p class="code-label">Python example - use the Python editor, not the game terminal</p><pre><code>length = int(input())
pieces = int(input())
roll = 40
used = length * pieces
left = roll - used
print(used)
print(left)</code></pre><p class="code-label">Example inputs, in order (one answer per input request)</p><pre><code>8
3</code></pre><p class="code-label">Output</p><pre><code>24
16</code></pre><p>This example measures ribbon. Calculate how much ribbon the pieces use, then subtract it from the roll. The <code>-</code> operator means subtraction. Each <code>print()</code> starts a new output line: used ribbon first, then what remains. A line beginning with <code>#</code> is a comment for people; Python does not execute it.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">4. Trace and debug a sequence</h3>
<p>Record the values after each step: length 8, pieces 3, roll 40, used 24, left 16. If <code>left = roll - used</code> came before used was first assigned, Python would report an error. If you wrote <code>used = length + pieces</code>, the program could run but calculate the wrong amount: a logic mistake.</p><p><strong>Predict:</strong> what should change when the inputs become 5 and 4?</p><blockquote><p>The used amount becomes 20 and the remainder becomes 20. The instructions stay the same; the inputs change. Do not replace the calculation with <code>print(24)</code>: that only imitates one example.</p></blockquote>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">5. Connect sequence to the game</h3>
<p>Python variables track quantities; the game tracks the knight's position. In both, a step starts from the result of earlier steps. Game commands such as <code>move(right)</code> belong in the game terminal. They are not built-in Python functions, and Python input/print examples do not control the knight.</p><p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>move(right)
move(right)
move(up)</code></pre>
<p><code>move</code> asks the knight to move. The direction inside the parentheses tells it which way: <code>up</code>, <code>down</code>, <code>left</code>, or <code>right</code>. Here, the directions are fixed directions on the screen, not instructions to turn the knight first.</p>
<p>The three lines form a <strong>sequence</strong>. In this simple program, the first move happens before the second, and the second happens before the third. The knight does not understand the intended route unless your instructions describe it. A blocked move does not mean the game will invent a detour for you.</p>
<p>Use the game command spelling when typing. The important idea, however, is the relationship between an instruction and its result, not memorizing parentheses.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">6. Order can change the route</h3>
<p>Compare right, right, up with up, right, right. On an empty practice area, these can finish at the same position. That does <strong>not</strong> mean they are always interchangeable. They visit different positions on the way.</p>
<p>Suppose the space directly above the start is blocked, but the route right, right, up is clear. Starting with up now attempts a blocked movement. The same directions and the same number of instructions can produce a different journey because the order changed.</p>
<p>When comparing two plans, ask both questions: Do they finish in the same place? Can every intermediate step actually happen?</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">7. Use the idea in your levels</h3>
<ul>
<li><strong>First Steps:</strong> inspect how far one move takes the knight and count the actions needed for the straight route.</li>
<li><strong>Turn the Corner:</strong> mark the point where the direction changes. Explain why the turn belongs there.</li>
<li><strong>Tight Corridor:</strong> split the route into short sections, then join those sections in the correct order.</li>
</ul>
<p>Before Run, name the goal and predict the route. After Run, compare what happened with your trace. If they differ, find the first difference before changing the program.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">8. Prepare for the Python activity</h3>
<p>In <strong>Plan a purchase</strong>, replace the ribbon situation with a notebook purchase. Identify the quantity, amount paid, fixed price, total cost, and change. Write the calculation plan before filling in the starter code. The price is 35 pesos and the task assumes enough money; no decision is needed yet.</p><p>A later step uses the result of an earlier step. You cannot calculate the change correctly until you know the total, just as you cannot plan a turn without knowing the position reached before it.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">9. Activity inputs and expected output</h3>
<p><strong>Plan a purchase:</strong> A notebook costs 35 pesos. Read the quantity and then the money paid, each as a whole number. Calculate the total before calculating the change. Print the total on the first line and the change on the second line. Assume there is enough money. Use calculations, not answers typed directly into print().</p><p>These are the required results, not a full code solution. Calculate or decide from the input; the same program must work with other valid values.</p><p class="code-label">Sample inputs, in order</p><pre><code>3
120</code></pre><p class="code-label">Output</p><pre><code>105
15</code></pre><p>Match the required output wording, capitalization and line order. When only numbers are requested, print numbers without extra labels or success messages. A correct idea can still need an output-format correction; explain the reasoning as well as checking the display.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">10. Practise, submit, and explain your reasoning</h3>
<p>Complete the available assigned game levels, then open this lesson's Python activity when it becomes available. Levels marked Coming Soon do not need to be completed first. Use the game to trace the concept visually and the activity to apply it to a different problem.</p><p>Type Python in the code editor and select Run Python. When the program asks for input, enter the next answer in the input field below the output; the output itself is not where you type code or answers. Each input call takes one answer. Practice checks try the supplied examples and are guidance, not the teacher's grade.</p><p>The worked examples above solve different problems from the assigned activity. Trace them on paper; if you try one in the activity editor, its output may not match that activity's checks. Return to the assigned task before submitting. Run records an attempt; Submit this Run sends the latest saved run for teacher review. Read teacher feedback in its run history.</p><p><strong>Explain:</strong> Explain why total cost must be calculated before change. Then explain why changing the order of movements can alter a route even when the final destination looks the same.</p>
</div>
$kc$,1,true),
  (2,$kc$Making Decisions with If$kc$,$kc$Use Python if statements to reason about optional actions, then connect true-or-false checks to guarded game movements and a fuel-warning activity.$kc$,$kc$Write and trace a Python if statement, distinguish conditional from unconditional instructions, test a boundary value, and connect the same decision to can() checks in the game.$kc$,$kc$<div class="lesson-block">
<h3 class="lesson-block-heading">1. Programming logic: decide whether an action is needed</h3>
<p>A <strong>condition</strong> is a question with a true-or-false answer. An <code>if</code> statement runs its body only when that answer is true; if false, execution continues after the body. Use the input and variables from Lesson 1 to represent the situation.</p><p>Before coding, state the rule in words: when is the action needed, and what should happen regardless of the answer? A condition asks a question; an action changes or displays something.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">2. Write the question precisely in Python</h3>
<p>Comparison operators express questions: <code>&lt;</code> means less than, <code>&gt;</code> greater than, <code>&lt;=</code> less than or equal to, <code>&gt;=</code> greater than or equal to, <code>==</code> equal to, and <code>!=</code> not equal to. Assignment <code>=</code> stores a value; comparison <code>==</code> tests equality.</p><p class="code-label">Python example - use the Python editor, not the game terminal</p><pre><code>temperature = int(input())
if temperature &gt; 30:
    print("Take a water break")
print("Reading recorded")</code></pre><p class="code-label">Example inputs, in order (one answer per input request)</p><pre><code>32</code></pre><p class="code-label">Output</p><pre><code>Take a water break
Reading recorded</code></pre>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">3. Indentation shows what belongs to the decision</h3>
<p>The colon <code>:</code> ends the if header. Indent its body by four spaces. The warning belongs to the decision; the final print aligns with if, so it runs afterward whether the condition was true or false. Python uses indentation to group instructions, not just to make code tidy.</p><p>If both prints were indented, a temperature of 20 would print nothing. If the warning had no indentation, the if statement would be incomplete and Python would report an indentation error. Valid indentation can also group the wrong actions: that is a logic problem.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">4. Trace true, false, and the boundary</h3>
<ul><li>Input 32: 32 &gt; 30 is true. Print the warning, then Reading recorded.</li><li>Input 20: false. Skip the warning but still print Reading recorded.</li><li>Input 30: false because the rule says above 30, not at least 30.</li></ul><p>The <strong>boundary</strong> is where the decision changes. Testing 29, 30 and 31 checks both sides and the exact boundary. Predict each output first. One successful example does not establish that the rule is correct for all inputs.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">5. Connect the Python decision to a game check</h3>
<p>Python compares a value here; the game checks whether movement is possible. Both decide whether to execute an indented action. <code>can(right)</code> is game-specific, not a standard Python function. An open movement may still be the wrong route to the exit.</p><p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>if can(right):
    move(right)</code></pre>
<p>Read this as: <strong>If moving right is possible now, move right.</strong> The word <code>if</code> introduces the decision. The condition is <code>can(right)</code>. The colon begins the following group of instructions, and the spaces before the move show that it belongs to that group.</p>
<p>That indented group is called a <strong>block</strong>. Use four spaces in these examples. The layout matters because it shows which instructions depend on the answer. Learn to see the relationship: the movement belongs to the decision.</p>
<p>If the answer is false, the program skips this block. It does not automatically move left, wait for a door, or search for a different route.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">6. Decide what belongs inside the block</h3>
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
<h3 class="lesson-block-heading">7. Apply it to the room, not just one move</h3>
<ul>
<li><strong>Check Before Moving:</strong> choose a direction on your planned route and explain the question before the guarded move.</li>
<li><strong>What If It Is Blocked?:</strong> predict a skipped move and describe how the later instructions continue around the obstacle.</li>
<li><strong>You Choose the Condition:</strong> match each question to the part of the route it should help with.</li>
</ul>
<p>An open direction is information about movement, not proof that the exit lies that way. Your full sequence must still reach the goal. Before each check, identify the knight's position at that point in the program.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">8. Prepare for the Python activity</h3>
<p>In <strong>Check the fuel warning</strong>, plan a warning that depends on fuel and a completion message that always runs. Read fuel once. Decide which print belongs inside the conditional block and which belongs after it.</p><p>The activity uses <em>below 5</em>, while the temperature example uses <em>above 30</em>. Choose the comparison from the task rather than copying unchanged. Predict the exact boundary at fuel 5 before running.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">9. Activity inputs and expected output</h3>
<p><strong>Check the fuel warning:</strong> Read a whole-number fuel amount. If fuel is below 5, print Low fuel. Always print Check complete afterward. When fuel is 5 or higher, the only output should be Check complete. Use an if condition so the warning is a decision, not a fixed message.</p><p>These are the required results, not a full code solution. Calculate or decide from the input; the same program must work with other valid values.</p><p class="code-label">Sample inputs, in order</p><pre><code>2</code></pre><p class="code-label">Output</p><pre><code>Low fuel
Check complete</code></pre><p>Match the required output wording, capitalization and line order. When only numbers are requested, print numbers without extra labels or success messages. A correct idea can still need an output-format correction; explain the reasoning as well as checking the display.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">10. Practise, submit, and explain your reasoning</h3>
<p>Complete the available assigned game levels, then open this lesson's Python activity when it becomes available. Levels marked Coming Soon do not need to be completed first. Use the game to trace the concept visually and the activity to apply it to a different problem.</p><p>Type Python in the code editor and select Run Python. When the program asks for input, enter the next answer in the input field below the output; the output itself is not where you type code or answers. Each input call takes one answer. Practice checks try the supplied examples and are guidance, not the teacher's grade.</p><p>The worked examples above solve different problems from the assigned activity. Trace them on paper; if you try one in the activity editor, its output may not match that activity's checks. Return to the assigned task before submitting. Run records an attempt; Submit this Run sends the latest saved run for teacher review. Read teacher feedback in its run history.</p><p><strong>Explain:</strong> For fuel 5, explain why the warning is skipped but the completion message still appears. In the game, explain what happens after an if block is skipped.</p>
</div>
$kc$,2,true),
  (3,$kc$Choosing Between Two Actions$kc$,$kc$Express two alternative actions with Python if/else, test equality at a decision boundary, and apply the same branch reasoning to game routes and an affordability activity.$kc$,$kc$Trace exactly one branch of Python if/else, place calculations in the appropriate branch, handle equality deliberately, and justify both game-route alternatives.$kc$,$kc$<div class="lesson-block">
<h3 class="lesson-block-heading">1. Programming logic: choose one of two alternatives</h3>
<p>An if statement can perform an optional action. An <strong>if/else</strong> statement chooses between two alternatives. When the condition is true, the if body runs; otherwise, the else body runs. For a single if/else decision, the two bodies do not both run.</p><p>Plan the question, the action for true, and the action for false. Then identify any steps that belong after either outcome.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">2. Express the two branches in Python</h3>
<p class="code-label">Python example - use the Python editor, not the game terminal</p><pre><code>height = int(input())
minimum = 120
if height &gt;= minimum:
    print("Ready")
    print(height - minimum)
else:
    print("Too short")</code></pre><p class="code-label">Example inputs, in order (one answer per input request)</p><pre><code>130</code></pre><p class="code-label">Output</p><pre><code>Ready
10</code></pre><p>This ride-height example prints Ready and the centimetres above the minimum when the requirement is met. Otherwise it prints Too short. <code>else:</code> aligns with if and has no additional condition. Its body is also indented four spaces. The two prints in the first body belong to the same branch.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">3. Equality is a decision you must make</h3>
<p>At height 120, <code>height &gt;= minimum</code> is true. Output is Ready followed by 0. Changing <code>&gt;=</code> to <code>&gt;</code> would wrongly reject someone exactly at the minimum. The syntax could be valid while the rule was wrong.</p><p>Test 119, 120 and 121, explaining the branch for each. In an affordability problem, the boundary is exactly the price: enough money includes the exact amount, even if nothing remains afterward.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">4. Keep branch-specific work inside its branch</h3>
<p>The difference calculation belongs with Ready. If its print moved below the whole if/else, it would also print a negative number after Too short. That would not match the stated output. Aligning a line with if means it runs after either branch; indenting it chooses which branch owns it.</p><p><strong>Predict:</strong> for input 119, which lines run?</p><blockquote><p>The comparison is false. Skip both prints under if, execute the print under else, and finish. Output only Too short.</p></blockquote>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">5. Connect the two branches to a game route</h3>
<p>Choosing numerical outcomes and choosing routes use the same structure. The game supplies <code>can()</code> and <code>blocked()</code>; those names are not built into the Python activity editor. <code>can(right)</code> asks whether movement right is possible; <code>blocked(right)</code> asks whether it is blocked. A true blocked check means you should consider a different route, not move into the obstacle.</p><p>Imagine a practice junction. Moving right is our preferred route when it is open. If right is blocked, we have already checked the map and know that up is an available alternative. These assumptions are part of the example.</p>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>if can(right):
    move(right)
else:
    move(up)</code></pre>
<p>Right open gives true, so the right move runs and the else block is skipped. Right blocked gives false, so the up move runs instead. <strong>One branch is selected</strong>, not both.</p>
<p><code>else:</code> lines up with <code>if</code>. Each movement is indented underneath its own branch. The layout tells you which result selects which instructions.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">6. Else is an alternative, not a safety check</h3>
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
<h3 class="lesson-block-heading">7. Practise decisions in your levels</h3>
<ul>
<li><strong>Right or Up?:</strong> state which direction your decision prefers and why that helps the route.</li>
<li><strong>When the Answer Is No:</strong> explain the alternative before running the false case.</li>
<li><strong>Is It Blocked?:</strong> translate blocked into a yes-or-no question and check which branch true selects.</li>
<li><strong>Looks Can Be Misleading:</strong> distinguish a tile's appearance from whether movement is actually allowed.</li>
</ul>
<p>A condition tests a local fact. It does not tell you whether a direction eventually reaches the exit. After choosing a branch, continue tracing the rest of the room.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">8. Prepare for the Python activity</h3>
<p>In <strong>Can I afford the notebook?</strong>, read the available money once and compare it with 35. Decide when change should be calculated and displayed. The insufficient-money branch does not ask for a change value.</p><p>Check less than the price, exactly the price, and more than the price. Explain why exactly enough selects the affordable branch. As in a game detour, the alternative needs to be planned; else does not invent the correct action.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">9. Activity inputs and expected output</h3>
<p><strong>Can I afford the notebook?:</strong> A notebook costs 35 pesos. Read the money available as a whole number. If it is enough, print Buy and then the remaining money on the next line. Otherwise print Save more. Handle exactly 35 correctly. Use if and else to express the two choices.</p><p>These are the required results, not a full code solution. Calculate or decide from the input; the same program must work with other valid values.</p><p class="code-label">Sample inputs, in order</p><pre><code>50</code></pre><p class="code-label">Output</p><pre><code>Buy
15</code></pre><p>Match the required output wording, capitalization and line order. When only numbers are requested, print numbers without extra labels or success messages. A correct idea can still need an output-format correction; explain the reasoning as well as checking the display.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">10. Practise, submit, and explain your reasoning</h3>
<p>Complete the available assigned game levels, then open this lesson's Python activity when it becomes available. Levels marked Coming Soon do not need to be completed first. Use the game to trace the concept visually and the activity to apply it to a different problem.</p><p>Type Python in the code editor and select Run Python. When the program asks for input, enter the next answer in the input field below the output; the output itself is not where you type code or answers. Each input call takes one answer. Practice checks try the supplied examples and are guidance, not the teacher's grade.</p><p>The worked examples above solve different problems from the assigned activity. Trace them on paper; if you try one in the activity editor, its output may not match that activity's checks. Return to the assigned task before submitting. Run records an attempt; Submit this Run sends the latest saved run for teacher review. Read teacher feedback in its run history.</p><p><strong>Explain:</strong> Explain why only one branch runs, why exactly 35 counts as affordable, and why an else movement in the game still needs a safe route.</p>
</div>
$kc$,3,true),
  (4,$kc$When Actions Change the Situation$kc$,$kc$Track changing values in Python and changing mechanisms in the game; use the updated situation to make a decision in the balance activity.$kc$,$kc$Trace a variable before and after an update, make a decision using the current value, and order game actions so the required door or plate state is maintained.$kc$,$kc$<div class="lesson-block">
<h3 class="lesson-block-heading">1. Programming logic: later actions depend on the current state</h3>
<p><strong>State</strong> means the facts describing a program or room at a particular moment. A Python variable might hold the battery charge. Game state includes the knight's position, crates, and whether a door is open. An action changes these facts, so a later decision must use the updated situation.</p><p>A <strong>dependency</strong> means one step needs another first. Charging before checking energy can change the answer, just as activating a button before crossing can make a route possible.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">2. Read an update from right to left</h3>
<p class="code-label">Python example - use the Python editor, not the game terminal</p><pre><code>charge = 6
recharge = 10
charge = charge + recharge
print(charge)</code></pre><p class="code-label">Output</p><pre><code>16</code></pre><p>For <code>charge = charge + recharge</code>, evaluate the right side using the old values: 6 + 10 is 16. Then assign 16 to charge. This is an update, not a mathematical claim that charge equals charge plus 10 forever. Later uses of charge see 16 until another assignment changes it.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">3. Update first, then decide</h3>
<p class="code-label">Python example - use the Python editor, not the game terminal</p><pre><code>charge = int(input())
recharge = int(input())
cost = 15
charge = charge + recharge
if charge &gt;= cost:
    charge = charge - cost
    print(charge)
else:
    print("Wait")
    print(charge)</code></pre><p class="code-label">Example inputs, in order (one answer per input request)</p><pre><code>6
10</code></pre><p class="code-label">Output</p><pre><code>1</code></pre><p>Trace: charge begins at 6, becomes 16 after recharging, passes the cost check, and becomes 1 after use. Checking the original 6 before recharging would reject an action the updated charge can support. The order is part of the solution.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">4. Trace both outcomes and preserve the right value</h3>
<p>With inputs 2 and 3, the updated charge is 5. It cannot cover cost 15, so output Wait and 5. Do not subtract the cost in that branch. With inputs 5 and 10, all 15 units can be used and the result is 0. A zero final value is not itself a failure.</p><p>On paper, label the starting value, value after the update, condition result and final value. Find the first difference from that trace rather than adding extra operations at the end.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">5. Connect value updates to room updates</h3>
<p>The Python example changes numbers. In the game, movement may activate a mechanism and change a later path check. Python variables do not directly operate game doors; the shared skill is following state over time.</p><p>For this small example only, suppose one right move activates an ordinary button. Once pressed, it opens the passage directly above the knight's new position. Both movements have been checked against this imagined layout.</p>
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
<h3 class="lesson-block-heading">6. Distinguish a lasting change from a held condition</h3>
<ul>
<li><strong>Ordinary button:</strong> once activated, its linked door stays open when the activating object leaves.</li>
<li><strong>Pressure plate:</strong> its linked door stays open only while an allowed object remains on the plate. When nothing holds it, the door closes.</li>
</ul>
<p>A pressure plate is not simply an ordinary button with a short timer. What matters is whether it is still held. Standing on a plate can make the door open now without guaranteeing that the door will be open when you reach it.</p>
<p>Ask two different questions: Is the route open at this moment? Will the action I take next keep it open? The second question is what makes the plan reliable.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">7. Use a crate to keep a required fact true</h3>
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
<h3 class="lesson-block-heading">8. Practise with your mechanisms</h3>
<ul>
<li><strong>Open the Way:</strong> identify the button action that must happen before the crossing.</li>
<li><strong>Keep It Open:</strong> explain what holds the plate after the knight moves away.</li>
<li><strong>Multi-Door Vault:</strong> list which mechanism affects which passage, then order the dependencies.</li>
</ul>
<p>Before running, explain not only where the knight goes but what changes in the room. After running, look for the first state change that differed from your prediction.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">9. Prepare for the Python activity</h3>
<p>In <strong>Track a changing balance</strong>, read opening balance, deposit and withdrawal, in that order. The deposit changes the balance before the withdrawal decision. Draw the same before/update/decision/after trace used for battery charge.</p><p>The declined outcome keeps the balance <em>after the deposit</em>; it does not undo the deposit or subtract the failed withdrawal. Test a deposit that makes withdrawal possible, an insufficient updated balance, and a withdrawal using the full balance.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">10. Activity inputs and expected output</h3>
<p><strong>Track a changing balance:</strong> Read an opening balance, a deposit, and a withdrawal, in that order. Add the deposit to the balance first. If the updated balance can cover the withdrawal, subtract it and print the final balance. Otherwise print Declined and then the unchanged updated balance on the next line. Assume nonnegative whole-number inputs.</p><p>These are the required results, not a full code solution. Calculate or decide from the input; the same program must work with other valid values.</p><p class="code-label">Sample inputs, in order</p><pre><code>10
30
35</code></pre><p class="code-label">Output</p><pre><code>5</code></pre><p>Match the required output wording, capitalization and line order. When only numbers are requested, print numbers without extra labels or success messages. A correct idea can still need an output-format correction; explain the reasoning as well as checking the display.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">11. Practise, submit, and explain your reasoning</h3>
<p>Complete the available assigned game levels, then open this lesson's Python activity when it becomes available. Levels marked Coming Soon do not need to be completed first. Use the game to trace the concept visually and the activity to apply it to a different problem.</p><p>Type Python in the code editor and select Run Python. When the program asks for input, enter the next answer in the input field below the output; the output itself is not where you type code or answers. Each input call takes one answer. Practice checks try the supplied examples and are guidance, not the teacher's grade.</p><p>The worked examples above solve different problems from the assigned activity. Trace them on paper; if you try one in the activity editor, its output may not match that activity's checks. Return to the assigned task before submitting. Run records an attempt; Submit this Run sends the latest saved run for teacher review. Read teacher feedback in its run history.</p><p><strong>Explain:</strong> Explain which balance the condition checks and which balance a declined withdrawal preserves. In the game, explain why a pressure plate must remain held while its door is needed.</p>
</div>
$kc$,4,true),
  (5,$kc$Repeating Instructions$kc$,$kc$Use Python for loops to repeat a known number of steps and accumulate a result, then connect the pattern to game repeat commands and totaling item prices.$kc$,$kc$Trace a Python for/range loop for zero, one and several repetitions, initialize and update a running total, and distinguish repeated actions from one-time steps in the game.$kc$,$kc$<div class="lesson-block">
<h3 class="lesson-block-heading">1. Programming logic: repeat a known amount of work</h3>
<p>A <strong>loop</strong> repeats a group of instructions. Use a fixed-count loop when you know how many times the group should run. First identify the repeated work and count; do not use a loop only to make code shorter.</p><p>An <strong>iteration</strong> is one pass through the body. Count iterations separately from instructions: three passes through a two-action body perform six actions. Instructions within each pass still run in order.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">2. Use for and range in Python</h3>
<p class="code-label">Python example - use the Python editor, not the game terminal</p><pre><code>for step in range(3):
    print(step)
print("Finished")</code></pre><p class="code-label">Output</p><pre><code>0
1
2
Finished</code></pre><p><code>range(3)</code> supplies 0, 1 and 2: three values, with 3 excluded. On each pass, <code>step</code> receives the next value and the indented body runs. The name step is a variable you choose. The final print is outside the loop and runs once. With <code>range(0)</code>, the body runs zero times.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">3. Keep a running total</h3>
<p>An <strong>accumulator</strong> stores a result built over repeated steps. Begin a sum at 0 before the loop. Each pass adds the next value to the existing total.</p><p class="code-label">Python example - use the Python editor, not the game terminal</p><pre><code>count = int(input())
distance = 0
for segment in range(count):
    length = int(input())
    distance = distance + length
print(distance)</code></pre><p class="code-label">Example inputs, in order (one answer per input request)</p><pre><code>3
2
4
1</code></pre><p class="code-label">Output</p><pre><code>7</code></pre><p>This totals route-segment lengths. The first input counts segments; it is not a length to add. Remaining answers are read inside the loop, one per pass. For count 3, distance changes from 0 to 2 to 6 to 7.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">4. Decide what repeats and what happens once</h3>
<ul><li>Before the loop: read the count and initialize the accumulated value.</li><li>Inside the loop: read the next measurement and update the total.</li><li>After the loop: print the final answer once.</li></ul><p>If distance were reset to 0 inside every pass, earlier measurements would be lost. If print were inside the loop, it would display partial totals 2, 6 and 7 instead of only 7. Reading a measurement only before the loop could reuse one value instead of reading the next.</p><p>Test zero, one and several segments. Zero tests initialization and skipped repetition; one tests a single pass; several reveal errors that overwrite earlier values.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">5. Connect Python for to the game repeat command</h3>
<p>Python uses <code>for step in range(count):</code> for known-count repetition. KnightCode uses its custom <code>repeat(count):</code>. They share the idea of repeating a body, but their spellings are not interchangeable. There is no built-in Python <code>repeat()</code> command for this activity.</p><p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
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
<h3 class="lesson-block-heading">6. A repeated group can contain more than one action</h3>
<p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
<pre><code>repeat(2):
    move(right)
    move(up)</code></pre>
<p>Both indented instructions belong to the body. Each repetition performs right and then up. The expanded order is right, up, right, up. It is not right, right, up, up.</p>
<p>Two repetitions of a two-action body produce four movement actions. Keep these quantities separate: <strong>number of passes</strong> and <strong>number of actions inside each pass</strong>.</p>
<p>A block is repeated as a unit, but instructions within it still run in order. A loop does not remove the sequence rules you already learned.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">7. Use repetition in your levels</h3>
<ul>
<li><strong>Do It Again:</strong> find the right-and-up pattern, count its repetitions, and trace the position after each pair.</li>
<li><strong>Repeat, Then Turn:</strong> separate the repeated approach from the turn, button action and remaining route.</li>
</ul>
<p>Before Run, expand the loop aloud or on paper. After Run, compare the movement pattern. If it differs, inspect the body and count separately. A loop that finishes is not necessarily a loop that reaches the goal.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">8. Prepare for the Python activity</h3>
<p>In <strong>Total several items</strong>, the repeated value is a price rather than a route length. Read how many items there are, then exactly that many prices. Build the total across passes, and print only the final total.</p><p>Do not write three separate price inputs just because one example has three items. The count controls how many inputs are needed. With zero items, there are no price inputs and the initialized total is still a valid result.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">9. Activity inputs and expected output</h3>
<p><strong>Total several items:</strong> Read how many items there are. Then read one whole-number price for each item. Use a for loop to add all prices and print only the final total. Zero items must produce 0. Do not write one separate input line for every example item: the loop should work for any nonnegative count.</p><p>These are the required results, not a full code solution. Calculate or decide from the input; the same program must work with other valid values.</p><p class="code-label">Sample inputs, in order</p><pre><code>3
10
20
5</code></pre><p class="code-label">Output</p><pre><code>35</code></pre><p>Match the required output wording, capitalization and line order. When only numbers are requested, print numbers without extra labels or success messages. A correct idea can still need an output-format correction; explain the reasoning as well as checking the display.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">10. Practise, submit, and explain your reasoning</h3>
<p>Complete the available assigned game levels, then open this lesson's Python activity when it becomes available. Levels marked Coming Soon do not need to be completed first. Use the game to trace the concept visually and the activity to apply it to a different problem.</p><p>Type Python in the code editor and select Run Python. When the program asks for input, enter the next answer in the input field below the output; the output itself is not where you type code or answers. Each input call takes one answer. Practice checks try the supplied examples and are guidance, not the teacher's grade.</p><p>The worked examples above solve different problems from the assigned activity. Trace them on paper; if you try one in the activity editor, its output may not match that activity's checks. Return to the assigned task before submitting. Run records an attempt; Submit this Run sends the latest saved run for teacher review. Read teacher feedback in its run history.</p><p><strong>Explain:</strong> Explain why the total starts outside the loop, each price is read inside it, and the final print is outside it. Identify a game movement that should happen only after repetition ends.</p>
</div>
$kc$,5,true),
  (6,$kc$Repeating While Something Is True$kc$,$kc$Use Python while loops to repeat until a changing condition becomes false, then connect stopping rules to game corridors and a savings-target activity.$kc$,$kc$Trace the check/body/update cycle of a Python while loop, justify its stopping condition, handle reaching or exceeding a target, and compare conditional loops with fixed-count game repetition.$kc$,$kc$<div class="lesson-block">
<h3 class="lesson-block-heading">1. Programming logic: let the current situation decide</h3>
<p>A for/range loop is useful when you know the number of repetitions. A <strong>while</strong> loop checks a condition before each pass and repeats while it remains true. You may know the goal without knowing how many passes will reach it.</p><p>Plan the starting state, the condition for continuing, and the action changing the state. If the body never makes progress toward a false condition, the loop may not stop.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">2. Trace a simple Python while loop</h3>
<p class="code-label">Python example - use the Python editor, not the game terminal</p><pre><code>remaining = 3
while remaining &gt; 0:
    print(remaining)
    remaining = remaining - 1
print("Finished")</code></pre><p class="code-label">Output</p><pre><code>3
2
1
Finished</code></pre><p>Check 3 &gt; 0, print 3, update to 2, and return to the check. After printing 1, the update makes remaining 0. The next check is false, so skip the body and print Finished. Python does not keep the answer from the first check.</p><p>If remaining started at 0, the body would run zero times. An if checks once and runs its body at most once; while may run it many times.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">3. Repeat input until a goal is reached</h3>
<p class="code-label">Python example - use the Python editor, not the game terminal</p><pre><code>capacity = int(input())
filled = 0
pours = 0
while filled &lt; capacity:
    amount = int(input())
    filled = filled + amount
    pours = pours + 1
print(filled)
print(pours)</code></pre><p class="code-label">Example inputs, in order (one answer per input request)</p><pre><code>10
6
5</code></pre><p class="code-label">Output</p><pre><code>11
2</code></pre><p>This records water poured toward a positive capacity, assuming positive whole-number pours and that going over is allowed. The amount accumulated and number of pours are different quantities. After 6 and 5, filled is 11 and pours is 2. The next check is false, so no third pour is requested.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">4. Choose a stopping rule that handles overshooting</h3>
<p><code>filled &lt; capacity</code> continues only below the goal, so equality and overshooting both stop it. <code>filled != capacity</code> would remain true at 11 when capacity is 10. With positive pours, moving further upward cannot reach 10 again.</p><p>Positive inputs advance the total. Zero would not advance it; a negative value would move it backward. Follow the activity's stated valid inputs. If a program keeps requesting unexpected input, stop it and inspect the condition, update and indentation rather than supplying endless answers.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">5. Connect the check-update cycle to the game</h3>
<p>In Python, changing a value can make the condition false. In the game, moving changes the position from which the path is checked. <code>can(right)</code> is game-specific, not a built-in function in the Python editor.</p><p class="code-label">KnightCode example - a small practice situation, not a full level solution</p>
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
<h3 class="lesson-block-heading">7. Practise on your routes</h3>
<ul>
<li><strong>Keep Going:</strong> identify the corridor's stopping point and the remaining route after it.</li>
<li><strong>Check Again:</strong> explain how each movement changes where the next check happens.</li>
<li><strong>Stop, Then Turn:</strong> keep the loop, button visit and final turn in the order the room needs.</li>
</ul>
<p>Use the room rather than a guessed count to justify a while condition. Test the planned endpoint: stopping safely at the wrong location still leaves the goal unsolved.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">8. Prepare for the Python activity</h3>
<p>In <strong>Save until the target</strong>, apply accumulation and counting to deposits. Read the positive target once. Start savings and the deposit count at zero. Determine which steps repeat and which outputs belong after the loop.</p><p>Explain exact-target, above-target and one-deposit cases before running. The number of deposits is not the amount saved. Once the target is reached or exceeded, finish without asking for another deposit. Print final savings and deposit count on separate lines without extra messages.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">9. Activity inputs and expected output</h3>
<p><strong>Save until the target:</strong> Read a positive whole-number target. Starting with savings of 0, repeatedly read a positive deposit while savings are below the target. Stop asking as soon as the target is reached or exceeded. Print the savings and then the number of deposits, on separate lines. Use a while loop with an update that makes the condition eventually false.</p><p>These are the required results, not a full code solution. Calculate or decide from the input; the same program must work with other valid values.</p><p class="code-label">Sample inputs, in order</p><pre><code>50
20
30</code></pre><p class="code-label">Output</p><pre><code>50
2</code></pre><p>Match the required output wording, capitalization and line order. When only numbers are requested, print numbers without extra labels or success messages. A correct idea can still need an output-format correction; explain the reasoning as well as checking the display.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">10. Practise, submit, and explain your reasoning</h3>
<p>Complete the available assigned game levels, then open this lesson's Python activity when it becomes available. Levels marked Coming Soon do not need to be completed first. Use the game to trace the concept visually and the activity to apply it to a different problem.</p><p>Type Python in the code editor and select Run Python. When the program asks for input, enter the next answer in the input field below the output; the output itself is not where you type code or answers. Each input call takes one answer. Practice checks try the supplied examples and are guidance, not the teacher's grade.</p><p>The worked examples above solve different problems from the assigned activity. Trace them on paper; if you try one in the activity editor, its output may not match that activity's checks. Return to the assigned task before submitting. Run records an attempt; Submit this Run sends the latest saved run for teacher review. Read teacher feedback in its run history.</p><p><strong>Explain:</strong> Explain what changes per pass, why positive deposits move toward stopping, and why comparing for inequality with the target fails above it. Describe the stopping reason in a game corridor.</p>
</div>
$kc$,6,true),
  (7,$kc$Plan, Try, and Improve$kc$,$kc$Combine Python sequences, decisions, updates and loops; use traces and boundary tests to debug both a game plan and the ticket-counter activity.$kc$,$kc$Decompose a problem, trace a decision inside a Python loop, diagnose initialization/count/boundary mistakes, and justify corrections using test evidence and game-state checkpoints.$kc$,$kc$<div class="lesson-block">
<h3 class="lesson-block-heading">1. Programming logic: combine ideas into a justified plan</h3>
<p>Solving a larger problem means selecting and combining sequences, conditions, updates and loops. <strong>Decomposition</strong> means breaking the goal into smaller tasks that you can explain and test separately.</p><p>Identify inputs, expected outputs and rules. Ask which work happens once, which repeats, and which depends on a condition. In the game, identify mechanisms that must change before a later route is possible.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">2. Plan before writing the complete program</h3>
<p>Consider a parcel counter. Read the parcel count and one whole-number weight per parcel. A weight of at least 10 earns 3 points; a lighter parcel earns 1 point. Print total points once. Assume nonnegative inputs.</p><ul><li>Start the points total at zero.</li><li>Repeat once per parcel: read its weight, choose the appropriate points, and add them.</li><li>After all parcels, print the total.</li></ul><p>A sequence handles setup and output, a loop handles the parcels, and a decision handles the rule for each parcel. The challenge is placing familiar features correctly.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">3. Trace a decision inside a loop</h3>
<p class="code-label">Python example - use the Python editor, not the game terminal</p><pre><code>parcels = int(input())
points = 0
for parcel in range(parcels):
    weight = int(input())
    if weight &gt;= 10:
        points = points + 3
    else:
        points = points + 1
print(points)</code></pre><p class="code-label">Example inputs, in order (one answer per input request)</p><pre><code>3
9
10
12</code></pre><p class="code-label">Output</p><pre><code>7</code></pre><p>The loop body is indented four spaces. The if/else bodies are indented eight spaces because they are inside a decision inside a loop. The final print returns to the left margin and runs after all passes.</p><ul><li>Weight 9: false branch, points becomes 1.</li><li>Weight 10: true branch, points becomes 4.</li><li>Weight 12: true branch, points becomes 7.</li></ul>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">4. Debug the cause, not just the final number</h3>
<p>Compare the intended trace with the actual result and find the first mismatch. Ask:</p><ul><li>Initialization: should any points exist before a parcel is read? Starting at 1 creates an extra point even for zero parcels.</li><li>Repetition count: does the program request exactly one weight per parcel? range(parcels + 1) requests an extra input.</li><li>Boundary: which category owns weight 10? Using &gt; instead of &gt;= puts it in the wrong category.</li></ul><p>Fix a cause, rerun the failing case, then test another case to check that the change did not break a correct result. A syntax error prevents execution; a logic error may produce readable but incorrect output. Matching output alone does not explain why the approach works.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">5. Choose tests that challenge your reasoning</h3>
<p>Test zero parcels, one below the boundary, one at the boundary, and mixed weights. Predict the outputs before running. Zero checks setup and loop count; the boundary checks the comparison; mixed weights check accumulation across both branches.</p><p>If an activity reports that it requested more input than an example supplies, inspect input calls and loop passes. Do not add arbitrary answers just to finish. If the numbers are correct but a check differs, also compare required text and line breaks.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">6. Connect combined Python logic to a game plan</h3>
<p>Choose the structure from the problem. Python variables track numerical state; game actions track position and mechanisms. Game commands are custom commands, so use them in the game terminal rather than pasting the Python parcel program there.</p><p>For this practice example, assume two right moves are clear. After them, up is open; right remains open after moving up. No goal ends the program early. Predict the full route:</p>
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
<h3 class="lesson-block-heading">7. Build and explain your own room solution</h3>
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
<h3 class="lesson-block-heading">8. Prepare for the Python activity</h3>
<p>In <strong>Repair the ticket counter</strong>, the starter code deliberately contains mistakes. The task uses visitors and ages rather than weights. Its rule is different: below age 12 costs 5; everyone else costs 10. Derive the condition from that rule instead of copying the parcel comparison.</p><p>Inspect the initial total, number of loop passes and age boundary. Trace zero visitors and age exactly 12, then a mixed group. Explain and repair the logic instead of hard-coding expected answers. Keep the final total print outside the loop.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">9. Activity inputs and expected output</h3>
<p><strong>Repair the ticket counter:</strong> Read the number of visitors, then one whole-number age per visitor. Tickets cost 5 for ages below 12 and 10 for everyone else. Use repetition and a decision to compute the total and print it once. Repair the starter program: it contains mistakes in its starting total, loop count, and age boundary. Test zero visitors and age exactly 12 before submitting.</p><p>These are the required results, not a full code solution. Calculate or decide from the input; the same program must work with other valid values.</p><p class="code-label">Sample inputs, in order</p><pre><code>3
8
12
20</code></pre><p class="code-label">Output</p><pre><code>25</code></pre><p>Match the required output wording, capitalization and line order. When only numbers are requested, print numbers without extra labels or success messages. A correct idea can still need an output-format correction; explain the reasoning as well as checking the display.</p>
</div>

<div class="lesson-block">
<h3 class="lesson-block-heading">10. Practise, submit, and explain your reasoning</h3>
<p>Complete the available assigned game levels, then open this lesson's Python activity when it becomes available. Levels marked Coming Soon do not need to be completed first. Use the game to trace the concept visually and the activity to apply it to a different problem.</p><p>Type Python in the code editor and select Run Python. When the program asks for input, enter the next answer in the input field below the output; the output itself is not where you type code or answers. Each input call takes one answer. Practice checks try the supplied examples and are guidance, not the teacher's grade.</p><p>The worked examples above solve different problems from the assigned activity. Trace them on paper; if you try one in the activity editor, its output may not match that activity's checks. Return to the assigned task before submitting. Run records an attempt; Submit this Run sends the latest saved run for teacher review. Read teacher feedback in its run history.</p><p><strong>Explain:</strong> For each repair, explain the original mistake, a test that exposed it, and why the correction works. Make the same explanation for the first incorrect step in a game plan.</p>
</div>
$kc$,7,true)
on conflict(id) do update set title=excluded.title,description=excluded.description,learning_objective=excluded.learning_objective,content=excluded.content,order_number=excluded.order_number,active=excluded.active;
select setval(pg_get_serial_sequence('public.lessons','id'),coalesce((select max(id) from public.lessons),1),true);

insert into public.levels(id,lesson_id,level_number,order_in_lesson,title,description,difficulty,xp_reward,active,starter_code_enabled,starter_code_template,starter_code_locked) values
  (1,1,1,1,$kc$First Steps$kc$,$kc$A single straight path. Get the knight to the goal using move() commands in order.$kc$,$kc$Beginner$kc$,100,true,false,$kc$$kc$,false),
  (2,1,2,2,$kc$Turn the Corner$kc$,$kc$The path bends. Combine directions to follow it around the corner.$kc$,$kc$Beginner$kc$,100,true,false,$kc$$kc$,false),
  (3,1,3,3,$kc$Tight Corridor$kc$,$kc$A longer, winding path — plan the full sequence before you run it.$kc$,$kc$Beginner$kc$,100,true,false,$kc$$kc$,false),
  (4,2,4,1,$kc$Check Before Moving$kc$,$kc$Reach the exit across a room divided by a central wall. Plan the route around the wall and use if can() to check a direction before taking that part of the route.$kc$,$kc$Beginner$kc$,100,true,false,$kc$$kc$,false),
  (5,2,5,2,$kc$What If It Is Blocked?$kc$,$kc$A wall blocks the direct route to the far exit. Let a guarded move be skipped, then guide the knight around the wall through the open passage.$kc$,$kc$Beginner$kc$,100,true,false,$kc$$kc$,false),
  (6,2,6,3,$kc$You Choose the Condition$kc$,$kc$Navigate two corners and a blocked shortcut to reach the opposite side of the room. Choose conditions that help check your planned route.$kc$,$kc$Intermediate$kc$,100,true,false,$kc$$kc$,false),
  (7,3,7,1,$kc$Right or Up?$kc$,$kc$At a junction around a central obstacle, choose right or up with if/else, then continue to the room’s distant exit. An open direction is not automatically the correct route.$kc$,$kc$Beginner$kc$,100,true,false,$kc$$kc$,false),
  (8,3,8,2,$kc$When the Answer Is No$kc$,$kc$The preferred passage is blocked, but another route leads around the obstacle to the exit. Use else for the alternative, then finish the room.$kc$,$kc$Intermediate$kc$,100,true,false,$kc$$kc$,false),
  (9,3,9,3,$kc$Is It Blocked?$kc$,$kc$Use blocked() to recognize a blocked passage in a small maze room. Choose the detour and continue through the room to the far exit.$kc$,$kc$Intermediate$kc$,100,true,false,$kc$$kc$,false),
  (10,3,10,4,$kc$Looks Can Be Misleading$kc$,$kc$A wall-looking panel lies on the route to the far side of the room. Test whether it is passable, choose your route, and reach the exit beyond it.$kc$,$kc$Advanced$kc$,100,true,false,$kc$$kc$,false),
  (11,4,11,1,$kc$Open the Way$kc$,$kc$The exit is behind an openable wall. Reach an ordinary button in a side area, activate it, then return and cross the opened passage to finish the room.$kc$,$kc$Beginner$kc$,100,true,false,$kc$$kc$,false),
  (12,4,12,2,$kc$Keep It Open$kc$,$kc$A pressure plate controls the wall guarding the exit. Place a crate on the plate, leave it there, and guide the knight along the open route to the other side.$kc$,$kc$Intermediate$kc$,100,true,false,$kc$$kc$,false),
  (13,4,13,3,$kc$Multi-Door Vault$kc$,$kc$Multiple plates and doors in one grid, solved in the right order.$kc$,$kc$Advanced$kc$,100,true,false,$kc$$kc$,false),
  (14,5,14,1,$kc$Do It Again$kc$,$kc$Cross a room with a repeated right-and-up route. Use repeat() for that pattern, then follow the final passage to the exit.$kc$,$kc$Beginner$kc$,100,true,false,$kc$$kc$,false),
  (15,5,15,2,$kc$Repeat, Then Turn$kc$,$kc$A repeated corridor leads to a button that opens the exit route. Finish the repetitions, turn once, activate the button, and take the open passage across the room.$kc$,$kc$Intermediate$kc$,100,true,false,$kc$$kc$,false),
  (16,6,16,1,$kc$Keep Going$kc$,$kc$Follow a long corridor inside a puzzle room with while can(). After the loop stops, take the remaining turns to reach the exit on the other side.$kc$,$kc$Beginner$kc$,100,true,false,$kc$$kc$,false),
  (17,6,17,2,$kc$Check Again$kc$,$kc$Follow a bent route through the room, checking again after each move. Use while loops for its straight sections and continue until the distant exit is reached.$kc$,$kc$Intermediate$kc$,100,true,false,$kc$$kc$,false),
  (18,6,18,3,$kc$Stop, Then Turn$kc$,$kc$The way to the exit goes around a divider and through a button-controlled wall. Combine corridor loops with the button visit and final turn.$kc$,$kc$Advanced$kc$,100,true,false,$kc$$kc$,false),
  (19,7,19,1,$kc$Find and Fix$kc$,$kc$Fix a plan that reaches a locked wall before the crate holds its plate down. Put the room-solving steps in order, then cross to the exit.$kc$,$kc$Advanced$kc$,100,true,false,$kc$$kc$,false),
  (20,7,20,2,$kc$Your KnightCode Challenge$kc$,$kc$Solve a complete puzzle room with a repeated approach, a crate-sensitive plate, and an exit behind an openable wall. Plan, test, and explain how your program reaches the goal.$kc$,$kc$Advanced$kc$,100,true,false,$kc$$kc$,false)
on conflict(id) do update set lesson_id=excluded.lesson_id,level_number=excluded.level_number,order_in_lesson=excluded.order_in_lesson,title=excluded.title,description=excluded.description,difficulty=excluded.difficulty,xp_reward=excluded.xp_reward,active=excluded.active,starter_code_enabled=excluded.starter_code_enabled,starter_code_template=excluded.starter_code_template,starter_code_locked=excluded.starter_code_locked;
select setval(pg_get_serial_sequence('public.levels','id'),coalesce((select max(id) from public.levels),1),true);

insert into public.achievements(id,name,description,icon,requirement_type,requirement_value) values
  (1,$kc$First Steps$kc$,$kc$Complete your first level.$kc$,$kc$🎯$kc$,$kc$levels_completed$kc$,1),
  (2,$kc$Rising Knight$kc$,$kc$Complete 10 levels.$kc$,$kc$⚔️$kc$,$kc$levels_completed$kc$,10),
  (3,$kc$Code Champion$kc$,$kc$Complete every active level.$kc$,$kc$🏆$kc$,$kc$full_course$kc$,1),
  (4,$kc$On a Roll$kc$,$kc$Build a 3-day learning streak.$kc$,$kc$🔥$kc$,$kc$streak$kc$,3),
  (5,$kc$Unstoppable$kc$,$kc$Build a 7-day learning streak.$kc$,$kc$⚡$kc$,$kc$streak$kc$,7),
  (6,$kc$XP Hunter$kc$,$kc$Earn 1,000 XP.$kc$,$kc$⭐$kc$,$kc$xp$kc$,1000)
on conflict(id) do update set name=excluded.name,description=excluded.description,icon=excluded.icon,requirement_type=excluded.requirement_type,requirement_value=excluded.requirement_value;
select setval(pg_get_serial_sequence('public.achievements','id'),coalesce((select max(id) from public.achievements),1),true);
