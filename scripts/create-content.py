"""Deterministic content authoring tool. Runtime reads public/lessons.json only."""
import csv
import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
worlds = [
 {'id':1,'name':'Neon Garden','subtitle':'Make your first spark.','color':'#c9f66b','start':1,'end':6,'boss':'The Launch Warden','symbol':'01','concept':'variables'},
 {'id':2,'name':'Crystal Caverns','subtitle':'Find your own way through.','color':'#a7c7ff','start':7,'end':12,'boss':'The Branching Sentinel','symbol':'02','concept':'loops'},
 {'id':3,'name':'Floating Library','subtitle':'Give every idea a place.','color':'#c3b2ff','start':13,'end':19,'boss':'The Inventory Hydra','symbol':'03','concept':'lists'},
 {'id':4,'name':'Clockwork Forge','subtitle':'Build something you can reuse.','color':'#ffbd8a','start':20,'end':25,'boss':'The Broken Automaton','symbol':'04','concept':'functions'},
 {'id':5,'name':'Holographic Lab','subtitle':'Turn questions into evidence.','color':'#82ddd5','start':26,'end':30,'boss':'The Evidence Engine','symbol':'05','concept':'dataframe'},
]
lessons=[]
def test(expr, message, success='That result checks out.'):
 return {'expression':expr,'message':message,'success':success}
def out(value):
 return [test(f'__output__ == {value!r}', f'Print exactly {value!r}. Check values, spacing, and line order.')]
def code(title,prompt,solution,tests,starter='',hint='Compare the requested result with each instruction.',explain='',wrong=None,kind='write',inputs=None,packages=None):
 return {'title':title,'type':kind,'prompt':prompt,'starterCode':starter,'solution':solution,'tests':tests,'inputs':inputs or [],'packages':packages or [],
 'hints':[hint,explain or 'Use the example above, replacing its names and values with the ones requested here.',solution],
 'explanation':explain or hint,'wrongAnswers':wrong or ['pass',"print('not the answer')"]}
def predict(title,source,answer,hint,choices=None):
 wrong=[a for a in (choices or ['Nothing','Error','0','1']) if a != answer][:2]
 return {'title':title,'type':'predict','prompt':'Predict exactly what this code prints. Put each printed line on its own line.','source':source,'solution':answer,'tests':[],
 'hints':[hint,'Follow the values from top to bottom; do not execute the program yet.',answer], 'explanation':hint,'wrongAnswers':wrong,'inputs':[],'packages':[], 'choices':choices or []}
def fill(title,template,answer,tests,hint,wrong=None):
 return {'title':title,'type':'fill','prompt':'Replace ___ with one expression. The rest of the program stays the same.','template':template,'solution':answer,'tests':tests,
 'hints':[hint,'Use a single expression rather than rewriting the whole program.',answer],'explanation':hint,'wrongAnswers':wrong or ['None',"'wrong'"],'inputs':[],'packages':[]}
def reorder(title,solution,tests,hint):
 lines=solution.split('\n')
 order=list(range(len(lines)))
 random.Random(title).shuffle(order)
 if order==list(range(len(lines))): order.reverse()
 return {'title':title,'type':'reorder','prompt':'Move the lines into a working order. Indentation travels with each line.','lines':[lines[i] for i in order],
 'solution':solution,'tests':tests,'hints':[hint,'Create values before using them. Keep indented lines beneath their parent.',solution], 'explanation':hint,
 'wrongAnswers':['\n'.join(reversed(lines)),"print('wrong order')"],'inputs':[],'packages':[]}
def audit(title,prompt,broken,solution,tests,hint,explain='',packages=None,inputs=None):
 c=code(title,'AI-code audit: '+prompt,solution,tests,broken,hint,explain,wrong=[broken,'pass'],kind='debug',inputs=inputs,packages=packages)
 c['aiAudit']=True
 return c
def lesson(day,title,topic,lines,example,challenges,takeaway,story,rabbit,visual=None):
 w=next(w for w in worlds if w['start']<=day<=w['end'])
 assert len(challenges)==5
 for i,c in enumerate(challenges,1):
  c['id']=f'd{day:02d}-c{i}'
  c['conceptTags']=[topic]
 lessons.append({'id':f'd{day:02d}','day':day,'world':w['id'],'title':title,'topic':topic,'conceptLines':lines,'example':example,
 'story':story,'rabbitHole':rabbit,'takeaway':takeaway,'visualizationId':visual or w['concept'],'boss':day==w['end'],
 'prerequisites':[] if day==1 else [f'd{day-1:02d}'],'challenges':challenges})

lesson(1,'A little spark','variables',
 ['A variable gives a value a name.','Use = to assign a value.','Use print(...) to show a value.','Python reads instructions from top to bottom.','Names are case-sensitive: energy and Energy differ.'],
 'energy = 5\nprint(energy)',[
 code('Wake Pip','Print Hello, Pip! exactly.',"print('Hello, Pip!')",out('Hello, Pip!'),"# Your first line of Python\n",'Put the message inside quotes.', 'print() displays the value inside its parentheses.',wrong=["print('Hello Pip')","message = 'Hello, Pip!'"]),
 code('Label the battery','Create a variable named energy with the number 7. Print energy.','energy = 7\nprint(energy)',[test('energy == 7','Assign the number 7 to energy.'),*out('7')], 'energy =\n', 'Numbers do not need quotes.','The name is a label; print(energy) retrieves its value.',wrong=["energy = '7'\nprint(energy)",'energy = 8\nprint(energy)']),
 predict('The next value','energy = 3\nenergy = 8\nprint(energy)','8','A later assignment replaces the earlier value.',['3','8','11']),
 reorder('Wire the greeting',"name = 'Pip'\nmessage = name\nprint(message)",out('Pip'),'Define a name before another instruction reads it.'),
 audit('Almost the same name','The robot should print its name. Repair the misspelled variable.',"robot_name = 'Pip'\nprint(robot_nam)","robot_name = 'Pip'\nprint(robot_name)",out('Pip'),'Check every letter of the name.','Names must match exactly; Python does not guess intended spellings.')
 ],'Assign with =; show values with print().','The garden is quiet. Pip has a battery, a name, and absolutely no instructions. One line from you can turn the lights on.',
 {'title':'Why not just remember the number?','text':'A good variable name records what a value means. Tomorrow, energy can change without rewriting every place that uses it.','experiment':'Change energy from 7 to 70. Predict the output before running.'})

lesson(2,'Fuel for the journey','numbers',
 ['Integers are whole numbers; floats can have a decimal part.','Use +, -, *, and / for arithmetic.','Use // for floor division, not ordinary division.','Multiplication runs before addition.','Parentheses make your intended order explicit.'],
 'fuel = (2 + 3) * 4\nprint(fuel)',[
 code('Charge calculator','Create total as the sum of 12 and 8, then print it.','total = 12 + 8\nprint(total)',[test('total == 20','Add 12 and 8 into total.'),*out('20')],'total =\n','Use the + operator.',wrong=['total = 12 * 8\nprint(total)','total = 12 - 8\nprint(total)']),
 predict('Power bill','print(2 + 3 * 4)','14','Multiply 3 by 4 before adding 2.',['20','14','24']),
 fill('Share the fuel','share = 9 ___ 2\nprint(share)','/',out('4.5'),'Ordinary division preserves the fractional part.',wrong=['//','*']),
 code('Repair the formula','The sum of 2 and 3 must be multiplied by 4. Store it as result and print it.','result = (2 + 3) * 4\nprint(result)',[test('result == 20','Group 2 + 3 before multiplying.'),*out('20')],'result = 2 + 3 * 4\nprint(result)','Parentheses control the order.',wrong=['result = 2 + 3 * 4\nprint(result)','result = 2 * 3 + 4\nprint(result)']),
 audit('The missing fraction','Average fuel for two ships should be 4.5, not 4.','average = 9 // 2\nprint(average)','average = 9 / 2\nprint(average)',[test('average == 4.5','Use ordinary division to keep the fraction.')],'Compare / with //.')
 ],'Parentheses and the right division operator prevent quiet math errors.','Pip found nine energy cells and two ships. The fuel computer seems confident, but its arithmetic needs an independent check.',
 {'title':'Why does // say floor?','text':'It rounds a quotient down toward negative infinity, not simply toward zero. That distinction matters for negative numbers.','experiment':'Compare -9 / 2 and -9 // 2.'})

lesson(3,'Messages in the leaves','strings',
 ['A string is text between matching quotes.','Single or double quotes both work.','Use + to join strings.','A name outside quotes retrieves a value.','A name inside quotes is just text.'],
 "pilot = 'Swen'\nprint('Hello, ' + pilot)",[
 code('Build a callsign','Create callsign with the text ORBIT and print it.',"callsign = 'ORBIT'\nprint(callsign)",[test("callsign == 'ORBIT'",'Assign ORBIT as a string.'),*out('ORBIT')],"callsign =\n",'Text belongs inside quotes.'),
 fill('Join the message',"name = 'Pip'\nmessage = 'Hello, ' + ___\nprint(message)",'name',out('Hello, Pip'),'Retrieve the variable, not the word name.',wrong=["'name'","'Pip!' "]),
 predict('Predict the echo',"word = 'go'\nprint(word + word)",'gogo','String joining does not add a space automatically.',['go go','gogo','go']),
 code('Repair the quotes','Print The gate is open. Repair the broken quotation marks.',"print('The gate is open')",out('The gate is open'),"print('The gate is open\")",'The opening and closing quote must match.',kind='debug'),
 audit('Name or value?','The output should be Pip, not robot.',"robot = 'Pip'\nprint('robot')","robot = 'Pip'\nprint(robot)",out('Pip'),'Quotes change a name into literal text.')
 ],'Quoted text is a string; an unquoted name retrieves its value.','The garden broadcasts messages in fragments. Help Pip join the pieces without accidentally printing the labels on the wires.',
 {'title':'Text is a sequence, too','text':'Strings can be indexed like a row of characters. You will meet indexing when the library opens.','experiment':"Try print('ORBIT'[0]). What do you expect?"})

lesson(4,'A conversation with Pip','input',
 ['input() reads one text value.','Here, enter each reply in the Program inputs panel.','input() returns a string, even when you type digits.','Use int(text) for whole numbers or float(text) for decimals.','Keep the conversion close to the input.'],
 "cells = int(input())\nprint(cells + 1)",[
 code('Ask the pilot','Read one name with input() and print it.',"name = input()\nprint(name)",out('Swen'),'name =\n','Use input() to read the next line.',inputs=['Swen']),
 code('Convert the reply','Read the supplied age 26 as an integer, add 1, and print the result.','age = int(input())\nprint(age + 1)',out('27'),'age = input()\n','Wrap input() in int(...).',inputs=['26']),
 predict('Two digits',"a = '2'\nb = '3'\nprint(a + b)",'23','These are strings, so + joins text.',['5','23','6']),
 reorder('Wire the conversation',"name = 'Swen'\nmessage = 'Welcome, ' + name\nprint(message)",out('Welcome, Swen'),'Read or create the name before building the message.'),
 audit('Numbers in disguise','Two typed counts, 2 and 3, should add to 5.',"a = input()\nb = input()\nprint(a + b)","a = int(input())\nb = int(input())\nprint(a + b)",out('5'),'Convert both inputs before adding.',inputs=['2','3'])
 ],'Input arrives as text. Convert it before doing arithmetic.','Pip wants to listen, not just speak. The input station sends everything as text; you decide which replies are really numbers.',
 {'title':'What happens with an invalid number?','text':'int("two") raises ValueError. Clear feedback is better than quietly inventing a replacement value.','experiment':'Change Program inputs to two and read the translated error.'})

lesson(5,'The status beacon','fstrings',
 ['An f-string starts with f before the opening quote.','Place names or expressions inside {braces}.','Python inserts their values into the text.','Use :.1f to show one decimal place.','Formatting changes the display, not the original value.'],
 "name = 'Pip'\nprint(f'{name} is ready')",[
 code('Ship status','With cells = 8, print Cells: 8 using an f-string.',"cells = 8\nprint(f'Cells: {cells}')",out('Cells: 8'),'cells = 8\n','Put cells inside braces.'),
 fill('Fill the template',"name = 'Pip'\nprint(f'Pilot: {___}')",'name',out('Pilot: Pip'),'Use the variable name inside braces.',wrong=["'Swen'",'8']),
 predict('The banner',"x = 3\nprint(f'Next: {x + 1}')",'Next: 4','Expressions inside braces are evaluated.',['Next: 3','Next: 4','Next: {x + 1}']),
 code('Repair the readout','Print Fuel: 4.5 from fuel = 4.567, rounded to one decimal.',"fuel = 4.567\nprint(f'Fuel: {fuel:.1f}')",out('Fuel: 4.6'),'fuel = 4.567\n','Use :.1f inside the braces.','Rounding 4.567 to one decimal gives 4.6; the original variable is unchanged.'),
 audit('The absent f','The beacon should say Pip online.',"name = 'Pip'\nprint('{name} online')","name = 'Pip'\nprint(f'{name} online')",out('Pip online'),'Look just before the opening quote.')
 ],'F-strings keep readable messages connected to real values.','A status beacon should be readable at a glance. Give Pip a message that changes when the numbers do, without rebuilding the sentence.',
 {'title':'Formatting is not data cleaning','text':'Showing one decimal does not remove the other decimals from the variable. Analysis and presentation are separate decisions.','experiment':'Print fuel after the formatted message.'})
# Fix wording explicitly: the prompt must match its rounded reference.
lessons[-1]['challenges'][3]['prompt']='Print Fuel: 4.6 from fuel = 4.567, rounded to one decimal.'

lesson(6,'Launch the garden','world1-boss',
 ['Use names to preserve meaning.','Convert typed numbers before arithmetic.','Use parentheses when the order matters.','Build a readable report with an f-string.','Inspect a plausible answer rather than trusting its confidence.'],
 "distance = 12\nfuel = 3\nprint(f'Rate: {distance / fuel}')",[
 code('Name the ship',"Create ship = 'MOSS' and print MOSS ready.","ship = 'MOSS'\nprint(f'{ship} ready')",[test("ship == 'MOSS'",'Keep the ship name in ship.'),*out('MOSS ready')],hint='Store the name, then format it.'),
 code('Parse the fuel','Read the supplied 12 as a number, multiply by 2, and print 24.','fuel = int(input())\nprint(fuel * 2)',out('24'),inputs=['12'],hint='The input is text until you convert it.'),
 code('Calculate the journey','Store rate as 15 divided by 4. Print rate.','rate = 15 / 4\nprint(rate)',[test('rate == 3.75','Keep the fractional part.'),*out('3.75')],hint='Choose ordinary division.'),
 reorder('Assemble the launch report',"ship = 'MOSS'\ncells = 8\nreport = f'{ship}: {cells} cells'\nprint(report)",out('MOSS: 8 cells'),'Create both values before building the report.'),
 audit('Wrong operator, confident answer','The ship needs three packs of five cells. Print 15.',"packs = 3\ncells = 5\nprint(packs + cells)","packs = 3\ncells = 5\nprint(packs * cells)",out('15'),'A count of equal packs calls for multiplication.')
 ],'You can turn inputs into a small, readable Python program.','The Launch Warden checks five systems. Every correct step restores a section of the bridge. A retry costs nothing; clear reasoning is your fuel.',
 {'title':'Your first independent program','text':'A useful next step is a tiny calculator for something you understand well. Name inputs and outputs before writing formulas.','experiment':'Change the launch report to show two quantities and their total.'})

lesson(7,'True north','booleans',
 ['True and False are Boolean values.','Use == to compare equality; = assigns a value.','Use <, <=, >, and >= for ordered comparisons.','Use != for not equal.','Test exact boundary values, not only obvious cases.'],
 'energy = 10\nprint(energy >= 10)',[
 code('Open the gate','Set energy = 10. Set unlocked to whether energy is at least 10.','energy = 10\nunlocked = energy >= 10',[test('unlocked is True','At least 10 includes exactly 10.')],hint='At least means >=.'),
 predict('Same or different','print(4 == 4)\nprint(4 != 4)','True\nFalse','Equality and inequality give opposite answers here.',['True\nFalse','False\nTrue','True\nTrue']),
 fill('Exact boundary','age = 18\nallowed = age ___ 18\nprint(allowed)','>=',out('True'),'Include the boundary itself.',wrong=['>','<']),
 code('Repair the condition','With temperature = 9, set cold to whether temperature is below 10.','temperature = 9\ncold = temperature < 10',[test('cold is True','Use a less-than comparison.')],'temperature = 9\ncold = temperature > 10','The opening of the comparison faces the larger number.',kind='debug'),
 audit('The excluded match','A charge of exactly 10 must pass. Keep the existing charge value.','charge = 10\nready = charge > 10','charge = 10\nready = charge >= 10',[test('charge == 10 and ready is True','Keep charge = 10 and include equality.')],'Inspect the threshold, not the assignment.')
 ],'Boundary cases reveal mistakes that ordinary examples miss.','The cavern gates answer only yes or no. Pip has enough energy, but an overly strict comparison has kept one gate shut.',
 {'title':'Boolean values inside arithmetic','text':'Python treats True like 1 and False like 0 in some numeric contexts. That can be useful, but explicit conditions are clearer while learning.','experiment':'Predict print(True + True) before trying it.'},'variables')

lesson(8,'Choose a tunnel','branches',
 ['if runs its indented block when a condition is true.','else runs when that condition is false.','A colon starts each block.','Use four spaces inside a block.','Unindented code runs after the branch.'],
 "energy = 3\nif energy > 0:\n    print('Go')\nelse:\n    print('Charge')",[
 code('Choose the tunnel','With energy = 0, print Charge when energy is zero; otherwise print Go.',"energy = 0\nif energy == 0:\n    print('Charge')\nelse:\n    print('Go')",out('Charge'),'energy = 0\n','Use if and else with colons.'),
 predict('Which route?',"open_gate = False\nif open_gate:\n    print('Left')\nelse:\n    print('Right')",'Right','False selects the else block.',['Left','Right','Left\nRight']),
 reorder('Build a branch',"energy = 0\nif energy == 0:\n    print('Charge')\nprint('Checked')",out('Charge\nChecked'),'Keep the indented print directly below its if.'),
 code('Repair the indentation','Repair the code to print Safe once.',"safe = True\nif safe:\n    print('Safe')",out('Safe'),"safe = True\nif safe:\nprint('Safe')",'The body of if must be indented.',kind='debug'),
 audit('Outside the branch','The status is unsafe. The program must print only Stop.',"safe = False\nif safe:\n    print('Go')\nprint('Stop')\nprint('Go')","safe = False\nif safe:\n    print('Go')\nelse:\n    print('Stop')",out('Stop'),'Trace what runs regardless of the condition.')
 ],'Indentation is part of the program, not decoration.','Two tunnels look alike. Your first decision system will choose one route, then stop announcing contradictory instructions.',
 {'title':'A branch can be simpler than it looks','text':'When a value is already Boolean, if safe is clearer than if safe == True. Keep the condition readable.','experiment':'Change safe to True and predict which branch executes.'})

lesson(9,'Three-way crossing','logic',
 ['elif tests another condition if earlier ones were false.','Only the first matching branch runs.','and requires both conditions; or requires at least one.','not reverses a Boolean.','Write both comparisons fully: x == 1 or x == 2.'],
 "level = 2\nif level == 1:\n    print('Low')\nelif level == 2:\n    print('Mid')\nelse:\n    print('High')",[
 code('Route the crystal','With score = 75, print High for >= 90, Mid for >= 60, otherwise Low.',"score = 75\nif score >= 90:\n    print('High')\nelif score >= 60:\n    print('Mid')\nelse:\n    print('Low')",out('Mid'),'score = 75\n','Test the higher threshold first.'),
 fill('Two locks','has_key = True\nhas_energy = False\nready = has_key ___ has_energy\nprint(ready)','and',out('False'),'Both locks must be satisfied.',wrong=['or','!=']),
 predict('Reverse the signal','safe = False\nprint(not safe)','True','not reverses the Boolean.',['False','True','None']),
 code('Repair the branch order','For score = 95, print High instead of Mid. Keep both thresholds.',"score = 95\nif score >= 90:\n    print('High')\nelif score >= 60:\n    print('Mid')",out('High'),"score = 95\nif score >= 60:\n    print('Mid')\nelif score >= 90:\n    print('High')",'The first matching branch wins.',kind='debug'),
 audit('Always true','Only red or blue is accepted. For color = green, accepted must be False.',"color = 'green'\naccepted = color == 'red' or 'blue'","color = 'green'\naccepted = color == 'red' or color == 'blue'",[test("color == 'green' and accepted is False",'Compare color on both sides of or.')],'A nonempty string is truthy; it is not a second comparison.')
 ],'Read each comparison as a complete statement.','At the crossing, more paths do not mean more confusion. Test specific cases first and make both halves of each logical condition explicit.',
 {'title':'Short-circuit logic','text':'Python can skip the second part of and when the first is false. This is useful for checking a denominator before dividing.','experiment':'Try valid = 0 != 0 and 10 / 0 > 1. Why is there no division error?'})

lesson(10,'Light every bridge','for-loops',
 ['A for loop repeats a block for each item.','range(3) produces 0, 1, 2.','range(1, 4) produces 1, 2, 3.','The stop value is excluded.','An accumulator starts before the loop and updates inside it.'],
 'for step in range(3):\n    print(step)',[
 code('Light the bridge','Use a for loop to print 1, 2, 3 on separate lines.','for step in range(1, 4):\n    print(step)',out('1\n2\n3'),'for step in range(\n','Use one more than the last desired number as the stop.'),
 predict('Count the steps','for n in range(2):\n    print(n)','0\n1','The start defaults to zero; the stop is excluded.',['1\n2','0\n1','0\n1\n2']),
 fill('Finish the range','for n in range(1, ___):\n    print(n)','4',out('1\n2\n3'),'The stop comes after 3.',wrong=['3','5']),
 code('Collect energy','Use a loop to store the sum 1 + 2 + 3 + 4 in total.','total = 0\nfor n in range(1, 5):\n    total += n',[test('total == 10','Initialize total before the loop, then add each n.')],'total = 0\n','total += n means total = total + n.'),
 audit('Missing final step','Print every number from 1 through 5, including 5.','for n in range(1, 5):\n    print(n)','for n in range(1, 6):\n    print(n)',out('1\n2\n3\n4\n5'),'range excludes its stop value.')
 ],'A loop repeats a rule; range excludes its stopping point.','A bridge has many lights, but you should not need one instruction per bulb. Give Pip a repeatable rule and a precise stopping point.',
 {'title':'Why start at zero?','text':'Many collections number positions by their distance from the beginning. The first item is zero steps from the start.','experiment':'Compare range(5) with range(1, 6). Both produce five numbers.'})

lesson(11,'Keep the gears moving','while-loops',
 ['while repeats while its condition is true.','Create the state before the loop.','Change the state inside the loop.','Ask how the condition eventually becomes false.','Stop interrupts a run; five seconds triggers an automatic restart.'],
 'charge = 0\nwhile charge < 3:\n    charge += 1\nprint(charge)',[
 code('Recharge the core','Start charge at 0. Use while to increase it until 4, then print charge.','charge = 0\nwhile charge < 4:\n    charge += 1\nprint(charge)',[test('charge == 4','Stop when charge reaches 4.'),*out('4')],'charge = 0\n','Move charge closer to the stopping condition.'),
 predict('Countdown','n = 2\nwhile n > 0:\n    print(n)\n    n -= 1','2\n1','The loop stops before printing zero.',['2\n1','2\n1\n0','1\n0']),
 reorder('Place the update','n = 0\nwhile n < 2:\n    n += 1\nprint(n)',out('2'),'Keep the update inside the loop.'),
 fill('Make progress','n = 0\nwhile n < 3:\n    n += ___\nprint(n)','1',out('3'),'Use a positive step that lands exactly on 3.',wrong=['4','5']),
 audit('Nothing changes','Fix the counter so the loop finishes and prints 3. Do not run the broken version unchanged.','n = 0\nwhile n < 3:\n    next_n = n + 1\nprint(n)','n = 0\nwhile n < 3:\n    n = n + 1\nprint(n)',[test('n == 3','Update n itself so the condition can become false.'),*out('3')],'Updating a different name does not change n.')
 ],'Every while loop needs a visible path to stopping.','A crystal elevator keeps waiting for a counter to change. Pip can push the button forever; your job is to change the state the loop actually checks.',
 {'title':'The loop was not thinking','text':'An infinite loop follows your instructions exactly. It is not a moral failure or a mysterious crash. Find the state that never changes.','experiment':'Explain aloud which variable controls the loop and where it changes.'})

lesson(12,'Escape the sentinel','world2-boss',
 ['Use conditions to make a decision.','Use loops to repeat a decision.','Initialize a total once, before the loop.','Check the first, last, and exact-boundary cases.','A retry is another test case, not lost progress.'],
 'total = 0\nfor n in range(4):\n    if n > 1:\n        total += n\nprint(total)',[
 code('Read the signal','Set signal = 12 and ready to whether signal is at least 10.','signal = 12\nready = signal >= 10',[test('ready is True','12 meets the threshold of 10.')],hint='Compare the signal with the threshold.'),
 code('Choose the route','With charge = 0, print Rest. With positive charge the code should print Go.',"charge = 0\nif charge > 0:\n    print('Go')\nelse:\n    print('Rest')",out('Rest'),hint='Zero belongs in the else branch.'),
 code('Count safe steps','Store in count how many numbers in range(1, 7) are greater than 3.','count = 0\nfor n in range(1, 7):\n    if n > 3:\n        count += 1',[test('count == 3','The qualifying numbers are 4, 5, and 6.')],hint='Increase the count only when the condition matches.'),
 reorder('Assemble the escape','charge = 0\nwhile charge < 3:\n    charge += 1\nprint(charge)',out('3'),'Initialize, test, update, then report.'),
 audit('Reset inside the loop','The total should include 1 + 2 + 3, not just the final number.','for n in range(1, 4):\n    total = 0\n    total += n\nprint(total)','total = 0\nfor n in range(1, 4):\n    total += n\nprint(total)',[test('total == 6','Initialize total once, before the loop.')],'Follow what happens to total at the start of every repetition.')
 ],'A reliable program makes progress and preserves the state it needs.','The Branching Sentinel guards the cavern exit. Its five shields are decisions, boundaries, repetition, state, and a suspiciously confident total.',
 {'title':'Test cases are tiny experiments','text':'Try the smallest valid value, an ordinary value, and the boundary. A single successful example is not strong evidence that every case works.','experiment':'Write down three inputs that could expose a wrong comparison.'})

lesson(13,'A shelf for every value','lists',
 ['A list stores an ordered collection in [brackets].','The first position is index 0.','Use len(items) for the number of items.','The last nonnegative index is len(items) - 1.','Index -1 also retrieves the last item.'],
 "items = ['key', 'map', 'cell']\nprint(items[0])",[
 code('Pack the inventory',"Create items containing 'key', 'map', and 'cell', in that order.","items = ['key', 'map', 'cell']",[test("items == ['key', 'map', 'cell']",'Use a list with those three values in the specified order.')],hint='Use square brackets and commas.'),
 fill('Find the first cube',"items = ['key', 'map', 'cell']\nprint(items[___])",'0',out('key'),'The first index is zero.',wrong=['1','2']),
 predict('The final position',"values = [10, 20, 30]\nprint(values[-1])",'30','-1 means the last item.',['10','20','30']),
 code('Count the collection','Store the length of [2, 4, 8, 16] in count.','items = [2, 4, 8, 16]\ncount = len(items)',[test('count == 4','Count the items, not their sum.')],hint='Use len(...).'),
 audit('One position too far','Print the last item without stepping outside the list.',"items = ['key', 'map', 'cell']\nprint(items[len(items)])","items = ['key', 'map', 'cell']\nprint(items[-1])",out('cell'),'The number of items is one greater than the final nonnegative index.')
 ],'Lists preserve order; their positions start at zero.','The library stores every idea in a floating cube. Pip needs an inventory, but the shelf labels start at zero rather than one.',
 {'title':'Slices do not use an inclusive stop','text':'items[1:3] takes positions 1 and 2. Like range, the stopping position is excluded.','experiment':'Try slicing a list of five items.'},'lists')

lesson(14,'Moving the shelves','list-mutation',
 ['append(value) adds one item to a list in place.','append returns None, not the updated list.','Use items.copy() for a separate shallow copy.','Two names can refer to the same list.','enumerate(items) supplies each index and value.'],
 "items = ['key']\nitems.append('map')\nprint(items)",[
 code('Add a relic',"Start with ['key']; append 'map' to items.","items = ['key']\nitems.append('map')",[test("items == ['key','map']",'Append to the existing list.')],hint='Call items.append without assigning its result.'),
 code('Number the shelves',"Use enumerate to print 0: key and 1: map on separate lines.","items = ['key', 'map']\nfor i, item in enumerate(items):\n    print(f'{i}: {item}')",out('0: key\n1: map'),hint='enumerate yields two values per item.'),
 fill('Clone the inventory',"original = [1, 2]\ncopy = original.___\ncopy.append(3)",'copy()',[test('original == [1,2] and copy == [1,2,3]','Create a separate copy before appending.')],'Call the copy method.',wrong=['pop()', 'reverse()']),
 predict('Two names, one list','a = [1]\nb = a\nb.append(2)\nprint(a)','[1, 2]','Assignment alone does not copy a list.',['[1]','[1, 2]','[2]']),
 audit('The vanished list','After adding 3, items must remain [1, 2, 3].','items = [1, 2]\nitems = items.append(3)','items = [1, 2]\nitems.append(3)',[test('items == [1,2,3]','append mutates the list and returns None.')],'Do not replace items with the return value of append.')
 ],'Know whether an operation changes an object or returns a new one.','A shelf-moving machine has lost an inventory by storing the wrong return value. The relics are still there; the label now points somewhere else.',
 {'title':'A shallow copy has a boundary','text':'copy() separates the outer list, but nested lists can still be shared. That is a later rabbit hole, not something to memorize today.','experiment':'Explain the difference between b = a and b = a.copy().'},'lists')

lesson(15,'Paired coordinates','tuples',
 ['A tuple groups values without in-place item changes.','Use a comma to make a one-item tuple.','Unpacking assigns a value to each name.','zip pairs items from two collections.','Ordinary zip stops when the shorter collection ends.'],
 'position = (3, 7)\nx, y = position\nprint(x, y)',[
 code('Store coordinates','Create position as the tuple (3, 7).','position = (3, 7)',[test('isinstance(position, tuple) and position == (3,7)','Use a tuple, not a list.')],hint='Use parentheses and a comma.'),
 fill('Unpack the signal','point = (4, 9)\nx, y = ___\nprint(x + y)','point',out('13'),'Unpack the tuple into two names.',wrong=['(1, 2)','(4, 8)']),
 code('Pair the shelves',"Pair names ['A', 'B'] with values [10, 20] using zip. Store list(zip(...)) in pairs.","names = ['A','B']\nvalues = [10,20]\npairs = list(zip(names, values))",[test("pairs == [('A',10),('B',20)]",'Pair corresponding items, not every possible combination.')],hint='zip(names, values) creates paired tuples.'),
 predict('A shorter partner','print(list(zip([1, 2, 3], [4, 5])))','[(1, 4), (2, 5)]','Ordinary zip stops at the shorter collection.',['[(1, 4), (2, 5)]','[(1, 4), (2, 5), (3, 0)]','Error']),
 audit('Not quite a tuple','Create a one-item tuple containing the number 7.','single = (7)','single = (7,)',[test('isinstance(single, tuple) and single == (7,)','The comma makes a one-item tuple.')],'Parentheses alone only group an expression.')
 ],'Pairing depends on position; check collection lengths before trusting zip.','Coordinates arrive in pairs. A missing entry on one shelf can silently break a pairing, even when the code produces a tidy result.',
 {'title':'Demand matching lengths','text':'In modern Python, zip(a, b, strict=True) raises an error if the lengths differ. Silent truncation is not always what you intend.','experiment':'Try strict=True with collections of different lengths.'},'lists')

lesson(16,'Crates with names','dictionaries',
 ['A dictionary maps unique keys to values.','Use {key: value} pairs.','record[key] retrieves a value or raises KeyError.','record.get(key, default) provides an explicit fallback.','Use .items() to iterate over key-value pairs.'],
 "record = {'name': 'Pip', 'charge': 8}\nprint(record['charge'])",[
 code('Build a record',"Create record with name 'Pip' and charge 8.","record = {'name':'Pip', 'charge':8}",[test("record == {'name':'Pip','charge':8}",'Use the requested keys and values.')],hint='Each key is followed by a colon and a value.'),
 fill('Retrieve the key',"record = {'charge': 8}\nprint(record[___])","'charge'",out('8'),'Dictionary keys are not numeric positions.',wrong=["'energy'",'0']),
 code('Update the crate',"Start record as {'charge': 8}; change charge to 10.","record = {'charge':8}\nrecord['charge'] = 10",[test("record['charge'] == 10",'Assign through the charge key.')],hint='Use record[...]=...'),
 predict('A deliberate fallback',"record = {'name':'Pip'}\nprint(record.get('charge', 0))",'0','The key is absent, so get returns the supplied default.',['None','0','KeyError']),
 audit('A plausible wrong key','The stored key is patient_id. Print SYN001.',"record = {'patient_id':'SYN001'}\nprint(record['patientID'])","record = {'patient_id':'SYN001'}\nprint(record['patient_id'])",out('SYN001'),'Schema names must match exactly.')
 ],'Keys carry meaning; inspect the schema rather than guessing names.','The library is switching from numbered shelves to labeled crates. A confident spelling guess is not a substitute for reading the actual key.',
 {'title':'Defaults can conceal missing data','text':'A default of zero may mean no measurement, not a measured zero. Choose defaults deliberately and preserve missingness when it matters.','experiment':'Compare get("charge") with get("charge", 0).'},'dictionary')

lesson(17,'Only one of each','sets',
 ['A set contains unique values.','Use set(items) to remove duplicates.','Use value in collection for membership.','Sets do not preserve a dependable positional order.','Use a list when repetitions or ordering matter.'],
 'ids = [1, 1, 2]\nunique = set(ids)\nprint(len(unique))',[
 code('Remove duplicates','Store the unique values from [1, 1, 2, 3, 3] in unique.','unique = set([1,1,2,3,3])',[test('isinstance(unique,set) and unique == {1,2,3}','Use a set with the three unique values.')],hint='Use set(...).'),
 fill('Check the guest list',"names = {'Pip', 'Swen'}\nprint('Pip' ___ names)",'in',out('True'),'Membership uses in.',wrong=['not in','==']),
 predict('How many unique?',"print(len(set(['A','A','B'])))",'2','Repeated A contributes only one unique value.',['1','2','3']),
 code('Repair membership','Set present to whether 4 occurs in [2, 4, 6].','items = [2,4,6]\npresent = 4 in items',[test('present is True','Ask about membership, not equality with the entire list.')],'items = [2,4,6]\npresent = 4 == items','A collection and one of its values are not equal.',kind='debug'),
 audit('Duplicates are observations','The readings [2, 2, 8] contain three measurements. Their total must be 12. Do not discard repeats.','readings = [2,2,8]\ntotal = sum(set(readings))','readings = [2,2,8]\ntotal = sum(readings)',[test('total == 12','Repeated measurements still count.')],'Deduplication changes the data, not just its appearance.')
 ],'Remove duplicates only when uniqueness is actually the question.','Pip is counting visitors, then counting measurements. A set helps with the first task and quietly damages the second.',
 {'title':'Same value is not always the same event','text':'Two observations can share a value without being duplicates of the same record. Deduplicate using the right identifier, not a measurement.','experiment':'Describe when two values of 2 should count once and when they should count twice.'},'lists')

lesson(18,'A compact spell','comprehensions',
 ['A list comprehension builds a new list.','Write [expression for item in items].','Add if condition to keep only matching items.','The expression transforms; the condition filters.','Prefer a readable loop when the expression becomes complicated.'],
 'values = [1, 2, 3]\ndoubled = [x * 2 for x in values]',[
 code('Compress the loop','Create doubled containing each value in [1, 2, 3] multiplied by 2.','values = [1,2,3]\ndoubled = [x * 2 for x in values]',[test('doubled == [2,4,6]','Multiply each original value by 2.')],hint='Put the new expression before for.'),
 fill('Filter the inventory','values = [1, 4, 7]\nlarge = [x for x in values if ___]','x > 3',[test('large == [4,7]','Keep only values greater than 3.')],'The condition decides which items survive.',wrong=['x < 3','x > 7']),
 predict('Transform then collect','print([x + 1 for x in [0, 2]])','[1, 3]','The result has one transformed value per input.',['[0, 2]','[1, 3]','[1, 2, 3]']),
 code('Square the scores','Create squares as the squares of [2, 3, 4].','values = [2,3,4]\nsquares = [x * x for x in values]',[test('squares == [4,9,16]','Square each value rather than doubling it.')],hint='Multiply each value by itself.'),
 audit('The reversed filter','Keep scores at least 60. The result must be [60, 90].','scores = [40,60,90]\npassed = [x for x in scores if x < 60]','scores = [40,60,90]\npassed = [x for x in scores if x >= 60]',[test('passed == [60,90]','Keep the threshold and everything above it.')],'A tidy comprehension can still express the wrong question.')
 ],'Separate the transformation from the rule that selects records.','A short spell can replace a long loop. The library rewards clarity, not cleverness: the wrong comparison is still wrong when it fits on one line.',
 {'title':'Clarity is a feature','text':'Nested comprehensions can save lines and cost understanding. A longer loop with clear names may be the better analysis.','experiment':'Rewrite one comprehension as a normal for loop.'},'lists')

lesson(19,'Tame the inventory hydra','world3-boss',
 ['Choose lists for ordered observations.','Choose dictionaries for named fields.','Use sets only for genuine uniqueness.','Filter records using explicit conditions.','Check lengths and keys before combining collections.'],
 "records = [{'id':1,'score':80},{'id':2,'score':40}]\npassed = [r['id'] for r in records if r['score'] >= 60]",[
 code('Read the records',"From records = [{'id':'A','score':80},{'id':'B','score':40}], store the first score in first_score.","records = [{'id':'A','score':80},{'id':'B','score':40}]\nfirst_score = records[0]['score']",[test('first_score == 80','Use the first list item, then its score key.')],hint='A list index can lead to a dictionary lookup.'),
 code('Collect unique IDs',"Store unique_ids as a set from ['A','B','A','C'].","ids = ['A','B','A','C']\nunique_ids = set(ids)",[test("unique_ids == {'A','B','C'}",'Keep each ID once.')],hint='Use set.'),
 code('Filter the cargo',"For records = [{'id':'A','score':80},{'id':'B','score':40}], store IDs with scores >= 60 in passed.","records = [{'id':'A','score':80},{'id':'B','score':40}]\npassed = [r['id'] for r in records if r['score'] >= 60]",[test("passed == ['A']",'Filter on score but collect the ID.')],hint='The output expression and filter use different keys.'),
 reorder('Assemble the manifest',"items = ['key', 'map']\nitems.append('cell')\ncount = len(items)\nprint(f'Items: {count}')",out('Items: 3'),'Count after appending the new item.'),
 audit('A missing partner','The IDs have three entries but the values have two. Detect the mismatch by setting same_length to False; do not silently pair them.',"ids = ['A','B','C']\nvalues = [10,20]\nsame_length = len(list(zip(ids, values))) == len(values)","ids = ['A','B','C']\nvalues = [10,20]\nsame_length = len(ids) == len(values)",[test('same_length is False','Compare the original collection lengths.')],'The truncated output cannot prove that every original record was paired.')
 ],'The right collection preserves the meaning of your data.','The hydra has five heads and five conflicting inventories. Defeat it by preserving order, uniqueness, keys, filters, and the records that could otherwise disappear.',
 {'title':'Data checks before data answers','text':'Count records before and after each transformation. An unexplained change in count deserves investigation.','experiment':'Name two transformations that legitimately change row counts and one that should not.'},'dictionary')

lesson(20,'Build a little machine','functions',
 ['def names a reusable block of code.','Parameters are the inputs in parentheses.','return sends a value back to the caller.','print shows a value; it does not return that value.','Test a function with more than one input.'],
 'def double(x):\n    return x * 2\nprint(double(4))',[
 code('Build a converter','Define double(x) to return twice x. It must work for other inputs too.','def double(x):\n    return x * 2',[test('double(4) == 8','double(4) should return 8.'),test('double(-3) == -6 and double(0) == 0','Check negative and zero inputs.')],'def double(x):\n    ','Return a computed value, not a fixed answer.'),
 fill('Feed the machine','def add(a, b):\n    return a + b\nresult = add(___)','3, 5',[test('result == 8','Supply two inputs whose requested values are 3 and 5.')],'Separate the arguments with a comma.',wrong=['3','3, 4']),
 predict('Predict the return','def next_value(x):\n    return x + 1\nprint(next_value(6))','7','The returned value becomes the value of the function call.',['6','7','None']),
 code('Repair the function','Define square(x) to return x multiplied by itself.','def square(x):\n    return x * x',[test('square(3) == 9 and square(5) == 25','Compute a square, not double the number.')],'def square(x):\n    return x * 2','Test with more than one input.',kind='debug'),
 audit('Print is not return','Fix total(a, b) so callers receive the sum.','def total(a, b):\n    print(a + b)','def total(a, b):\n    return a + b',[test('total(2,3) == 5 and total(0,4) == 4','Return the sum so another instruction can use it.')],'Displaying a number is different from giving it back.')
 ],'A function turns inputs into a reusable result.','The forge can build a machine for every repeated operation. Pip wants a result it can use, not merely a number flashing on the machine display.',
 {'title':'A function is a contract','text':'Describe its inputs, its return value, and any special cases. This makes AI-generated functions much easier to audit.','experiment':'Explain what double should return for a negative number and for zero.'},'functions')

lesson(21,'Keep the gears independent','scope',
 ['A parameter can have a default value.','Names assigned inside a function are usually local.','Changing a local name does not change an outer variable.','Pass needed settings as explicit inputs.','Return new values instead of relying on hidden changes.'],
 'def boost(value, amount=1):\n    return value + amount\nprint(boost(4))',[
 code('Set a default','Define greet(name="Pip") returning Hello, followed by the name and an exclamation mark.',"def greet(name='Pip'):\n    return f'Hello, {name}!'",[test("greet() == 'Hello, Pip!' and greet('Swen') == 'Hello, Swen!'",'Support both the default and a supplied name.')],hint='A default appears in the parameter list.'),
 predict('Inside and outside','value = 5\ndef local():\n    value = 9\n    return value\nprint(value)\nprint(local())','5\n9','The function has its own local value.',['9\n9','5\n9','5\n5']),
 code('Pass the setting','Define adjust(value, offset=2) returning value plus offset.','def adjust(value, offset=2):\n    return value + offset',[test('adjust(3) == 5 and adjust(3,10) == 13','Use the supplied offset when present.')],hint='Use both parameters in the return expression.'),
 fill('Use the returned value','def recharge(value):\n    return value + 3\ncharge = 4\ncharge = ___','recharge(charge)',[test('charge == 7','Assign the returned value back to charge.')],'Call the function with the current charge.',wrong=['recharge(0)','charge']),
 audit('The change that stayed local','Increase charge from 4 to 7 by using the returned value.','charge = 4\ndef recharge(value):\n    value = value + 3\n    return value\nrecharge(charge)','charge = 4\ndef recharge(value):\n    return value + 3\ncharge = recharge(charge)',[test('charge == 7','The call returns a value; assign that result.')],'A function call does not automatically replace its argument.')
 ],'Explicit inputs and returned outputs make functions easier to trust.','One machine changes its own dial while the main control panel stays unchanged. Wire its output back deliberately instead of hoping the value will travel.',
 {'title':'Mutable defaults are a different trap','text':'A list used as a default parameter can be shared between calls. The safer pattern uses None, then creates a new list inside the function.','experiment':'For now, prefer numbers, strings, or None as defaults.'},'functions')

lesson(22,'Borrow a tested tool','imports',
 ['import loads a module of reusable tools.','Call a tool through its module name, such as math.sqrt.','An alias gives a module a shorter name.','Avoid replacing an imported module with a variable.','This offline kit includes the standard library and the lab packages.'],
 'import math\nprint(math.sqrt(16))',[
 code('Import the toolkit','Import math and store the square root of 81 in root.','import math\nroot = math.sqrt(81)',[test('root == 9','Call math.sqrt(81).')],hint='Use module.function(...).'),
 code('Calculate a mean','Use statistics.mean to store the mean of [2, 4, 9] in average.','import statistics\naverage = statistics.mean([2,4,9])',[test('average == 5','The sum is 15 across three values.')],hint='Import statistics first.'),
 predict('Module call','import math\nprint(math.floor(4.9))','4','floor returns the greatest integer no larger than the value.',['4','5','4.9']),
 fill('Repair the alias','import statistics as stats\naverage = ___.mean([4, 6])','stats',[test('average == 5','Call the module using its imported alias.')],'The alias is the name you introduced after as.',wrong=['statistics','math']),
 audit('A shadow over the module','Keep the math module available and store the square root of 16 in root.','import math\nmath = 16\nroot = math.sqrt(math)','import math\nvalue = 16\nroot = math.sqrt(value)',[test('root == 4','Do not replace the module name with a number.')],'Use a separate variable for the input.')
 ],'An imported tool is only useful while its name still refers to the module.','The forge has a well-stocked tool cabinet. Borrowing a tested tool is sensible; overwriting its label with an input value is less helpful.',
 {'title':'Imports are also an audit point','text':'Check that an AI-generated snippet names a real available library. Installing a package is a separate action from importing one.','experiment':'Identify which names in your snippet refer to modules and which refer to data.'},'functions')

lesson(23,'Read the machine alarm','debugging',
 ['Start with the final line of a traceback.','Read the exception type and its message.','Locate the relevant line in your own code.','Change one cause, then run again.','Do not hide every error behind a broad exception handler.'],
 "value = '7'\nnumber = int(value)\nprint(number + 1)",[
 code('Find the failing name','Repair the misspelled name and print 8.','charge = 8\nprint(charge)',out('8'),'charge = 8\nprint(chagre)','NameError often means a spelling or ordering mistake.',kind='debug'),
 code('Match the error','The input is text. Convert it and store numeric result = 8.','text = "7"\nresult = int(text) + 1',[test('result == 8','Convert the string before adding the number.')],'text = "7"\nresult = text + 1','A TypeError can reveal incompatible kinds of values.',kind='debug'),
 code('Repair a crash','Define safe_ratio(a, b): return None for b == 0; otherwise return a / b.','def safe_ratio(a, b):\n    if b == 0:\n        return None\n    return a / b',[test('safe_ratio(6,2) == 3','Use ordinary division.'),test('safe_ratio(6,0) is None','For this exercise, an undefined ratio should return None.')],hint='Check the denominator before dividing.'),
 reorder('Trace then report',"text = '7'\nnumber = int(text)\nresult = number + 1\nprint(result)",out('8'),'Convert first, calculate second, display last.'),
 audit('Silencing the alarm','Invalid text must be reported as missing (None), not invented as zero. Define parse_number(text).',"def parse_number(text):\n    try:\n        return float(text)\n    except Exception:\n        return 0", "def parse_number(text):\n    try:\n        return float(text)\n    except ValueError:\n        return None",[test("parse_number('2.5') == 2.5 and parse_number('bad') is None",'Preserve invalid data as None and valid numbers as numbers.')],'A default of zero can change the meaning of missing data.','Catch the specific expected error; do not quietly manufacture a measurement.')
 ],'An error message is evidence. Fix the cause rather than hiding the signal.','A machine alarm is useful information. Pip would rather hear exactly what failed than receive a reassuring but invented number.',
 {'title':'A minimal failing example','text':'Remove unrelated code until the problem still happens in a few lines. Small examples make both human and AI debugging more reliable.','experiment':'Reduce one error to two lines and explain its cause.'},'functions')

lesson(24,'The cargo manifest','files-csv',
 ['Files here live in a temporary, in-browser filesystem.','with open(...) closes a file when the block finishes.','csv.DictReader reads rows using the header as keys.','CSV values arrive as strings.','Convert numeric fields deliberately; a header is not a record.'],
 "import csv\nwith open('supplies.csv', newline='') as f:\n    rows = list(csv.DictReader(f))\nprint(len(rows))",[
 code('Open the log','Read supplies.csv as text into content. The header must be present.',"with open('supplies.csv') as f:\n    content = f.read()",[test("'item,units' in content and 'cell,4' in content",'Read the bundled supplies.csv file.')],hint='Use with open(...) as f, then f.read().'),
 code('Read the rows','Use csv.DictReader to store all three supply rows in rows.',"import csv\nwith open('supplies.csv', newline='') as f:\n    rows = list(csv.DictReader(f))",[test("len(rows) == 3 and rows[0]['item'] == 'cell'",'Use the header as names, not as an extra row.')],hint='Wrap the reader in list(...) to collect the records.'),
 code('Convert a column','Read supplies.csv and store the sum of integer units in total. Expected total: 13.',"import csv\nwith open('supplies.csv', newline='') as f:\n    rows = list(csv.DictReader(f))\ntotal = sum(int(row['units']) for row in rows)",[test('total == 13','Convert each units string before adding it.')],hint='Apply int to each row["units"].'),
 fill('Use the header',"import csv\nwith open('supplies.csv', newline='') as f:\n    rows = list(csv.___(f))\nprint(rows[0]['item'])",'DictReader',out('cell'),'You need named fields, not a list of raw strings.',wrong=['reader','DictWriter']),
 audit('One extra record','Count the three data rows in supplies.csv, not the header.',"with open('supplies.csv') as f:\n    count = len(f.readlines())","import csv\nwith open('supplies.csv', newline='') as f:\n    count = len(list(csv.DictReader(f)))",[test('count == 3','The header defines fields; it is not a supply record.')],'Ask what the first line represents.')
 ],'Read the schema, preserve the records, and convert numbers explicitly.','The forge receives a CSV manifest. It is plain text, not a spreadsheet with built-in meanings. Your code must interpret its rows and columns.',
 {'title':'Why not split every line on a comma?','text':'A quoted CSV value can contain a comma. A CSV parser handles that case correctly; naive string splitting can corrupt the columns.','experiment':'Imagine a cell containing "Gate, north". Count its fields with and without CSV quoting.'},'functions')

lesson(25,'Repair the automaton','world4-boss',
 ['Load records using their schema.','Keep file reading separate from calculation.','Define what missing values mean.','Return only after the required work is complete.','Test a helper with an empty collection and ordinary records.'],
 "def total_units(rows):\n    return sum(int(row['units']) for row in rows)",[
 code('Load the manifest','Read supplies.csv using DictReader into rows and set count to its number of data rows.',"import csv\nwith open('supplies.csv', newline='') as f:\n    rows = list(csv.DictReader(f))\ncount = len(rows)",[test('count == 3 and len(rows) == 3','There are three data rows.')],hint='The CSV reader handles the header.'),
 code('Build a summary function',"Define total_units(rows) to sum integer units. Each row is a dictionary with a units string.","def total_units(rows):\n    return sum(int(r['units']) for r in rows)",[test("total_units([{'units':'4'},{'units':'6'}]) == 10",'Convert strings before summing.'),test('total_units([]) == 0','An empty sum is zero.')],hint='Keep the function independent of the file.'),
 code('Handle a missing value',"Define parse_units(text) returning None for an empty string, otherwise int(text).", "def parse_units(text):\n    if text == '':\n        return None\n    return int(text)",[test("parse_units('') is None and parse_units('4') == 4",'Preserve missingness rather than turning it into an observed zero.')],hint='Check for the empty string first.'),
 code('Print the report','Read supplies.csv and print Total units: 13 from the data, using an f-string.',"import csv\nwith open('supplies.csv', newline='') as f:\n    rows = list(csv.DictReader(f))\ntotal = sum(int(r['units']) for r in rows)\nprint(f'Total units: {total}')",[test('total == 13','Calculate total from the units.'),*out('Total units: 13')],hint='Separate loading, calculation, and presentation.'),
 audit('Returning too early','Fix total_values(values) so it sums all values and returns 0 for an empty list.','def total_values(values):\n    total = 0\n    for value in values:\n        total += value\n        return total','def total_values(values):\n    total = 0\n    for value in values:\n        total += value\n    return total',[test('total_values([2,3,4]) == 9','Do not return during the first loop iteration.'),test('total_values([]) == 0','An empty input still needs a return value.')],'Inspect the indentation of return.')
 ],'Reusable functions and explicit data checks beat a confident-looking script.','The automaton has all the right parts, but one return instruction stops its work early. Restore the full pipeline and carry your tools into the lab.',
 {'title':'A successful run is not a correct analysis','text':'Some errors crash loudly. Others return plausible values from the wrong subset. Tests should check meaning, not just the absence of exceptions.','experiment':'Name one bug from this world that produced a number without crashing.'},'functions')

P=['pandas']
PM=['pandas','matplotlib']
LOAD="import pandas as pd\ndf = pd.read_csv('patients.csv')\n"
lesson(26,'Meet the synthetic cohort','dataframes',
 ['A DataFrame is a table with named columns.','pd.read_csv(...) loads a CSV into a DataFrame.','Use .shape, .head(), and .dtypes to inspect it.','Use .isna().sum() to count missing values.','These records are synthetic; do not upload real patient data.'],
 LOAD+"print(df.shape)\nprint(df.head())",[
 code('Load the cohort','Load patients.csv as a pandas DataFrame named df. Keep all records.',LOAD,[test('isinstance(df,pd.DataFrame) and df.shape == (240,5)','The complete table has 240 rows and five columns.')],starter='import pandas as pd\n',hint='Use pd.read_csv with the local file name.',packages=P),
 code('Inspect the grid','Load patients.csv. Store its row count in n and its column names as a list in columns.',LOAD+'n = len(df)\ncolumns = list(df.columns)',[test('n == 240','Count the full DataFrame.'),test("columns == ['patient_id','age','baseline_score','followup_days','outcome']",'Inspect the existing column names rather than guessing.')],starter=LOAD,hint='len(df) counts rows; df.columns gives names.',packages=P),
 code('Find missing values','Load patients.csv. Set missing to the number of missing baseline_score values.',LOAD+"missing = int(df['baseline_score'].isna().sum())",[test("missing == int(pd.read_csv('patients.csv')['baseline_score'].isna().sum()) and missing > 0",'Count missing values, not zeros or all records.')],starter=LOAD,hint='Use isna() on the column, then sum().',packages=P),
 code('Repair the column lookup','Load patients.csv and store the age column in ages.',LOAD+"ages = df['age']",[test("ages.equals(df['age'])",'Use the exact column name age.')],starter=LOAD+"ages = df['Age']",hint='Column names are case-sensitive.',kind='debug',packages=P),
 audit('A preview is not the dataset','Keep all records in df and store their count in n.',LOAD+"df = df.head()\nn = len(df)",LOAD+'n = len(df)',[test('len(df) == 240 and n == 240','head() previews rows; it should not replace the full cohort.')],'Separate inspection from transformation.',packages=P)
 ],'Inspect the whole table before you ask it a question.','Welcome to the holographic lab. Every record is fictional. The first task is not discovering a pattern; it is finding out what you actually loaded.',
 {'title':'Why synthetic records?','text':'They let you practice missingness, grouping, and joins without exposing a real person. Their relationships are invented and have no clinical validity.','experiment':'Count records and missing values before interpreting any averages.'},'dataframe')

lesson(27,'Choose the right cohort','dataframe-filters',
 ['A comparison on a column produces a Boolean mask.','Use df[mask] to keep matching rows.','Use & and | for elementwise combinations.','Put each comparison in parentheses.','A filter changes the denominator; count what remains.'],
 LOAD+"older = df[df['age'] >= 60]\nprint(len(older))",[
 code('Select a cohort','Load patients.csv. Store records with outcome == 1 in cases.',LOAD+"cases = df[df['outcome'] == 1]",[test("cases.equals(df[df['outcome'] == 1])",'Filter rows using the outcome comparison.')],starter=LOAD,hint='Put the Boolean mask inside df[...].',packages=P),
 code('Combine two filters','Store records with age >= 60 AND outcome == 1 in selected.',LOAD+"selected = df[(df['age'] >= 60) & (df['outcome'] == 1)]",[test("selected.equals(df[(df['age'] >= 60) & (df['outcome'] == 1)])",'Use & between parenthesized comparisons.')],starter=LOAD,hint='Both conditions must hold for the same row.',packages=P),
 code('Count the matches','Set n_selected to the number of records with age < 50.',LOAD+"n_selected = len(df[df['age'] < 50])",[test("n_selected == int((df['age'] < 50).sum())",'Count selected rows, not all rows.')],starter=LOAD,hint='Filter first, then count.',packages=P),
 code('Repair the boundary','Set selected to the records with age at least 60, including exactly 60.',LOAD+"selected = df[df['age'] >= 60]",[test("selected.equals(df[df['age'] >= 60])",'At least includes the boundary.')],starter=LOAD+"selected = df[df['age'] > 60]",hint='Use the inclusive comparison.',kind='debug',packages=P),
 audit('The wrong kind of and','Select age >= 60 and outcome == 1 into selected.',LOAD+"selected = df[(df['age'] >= 60) and (df['outcome'] == 1)]",LOAD+"selected = df[(df['age'] >= 60) & (df['outcome'] == 1)]",[test("selected.equals(df[(df['age'] >= 60) & (df['outcome'] == 1)])",'Use the elementwise operator & with parentheses.')],'A Series contains many Boolean values, not one.',packages=P)
 ],'Every filter defines who is included in your answer.','Pip can illuminate any subset of the point cloud. Choose the subset deliberately, and keep its size visible instead of letting the denominator disappear.',
 {'title':'Missing values and comparisons','text':'Missing numeric values usually do not pass an ordinary threshold comparison. Report how many were missing rather than treating exclusion as neutral.','experiment':'Compare a threshold-filter count with the number of nonmissing measurements.'},'dataframe')

lesson(28,'Compare, then visualize','groupby',
 ['groupby splits a table into groups.','.size() counts rows; .count() counts nonmissing values.','Use .mean() on a selected numeric column.','Keep group sizes beside averages.','A simple labeled chart can show a descriptive difference.'],
 LOAD+"summary = df.groupby('outcome')['age'].mean()\nprint(summary)",[
 code('Split by outcome','Create counts as df.groupby("outcome").size().',LOAD+"counts = df.groupby('outcome').size()",[test("counts.equals(df.groupby('outcome').size())",'Count records in each outcome group.')],starter=LOAD,hint='size counts rows, even when another field is missing.',packages=P),
 code('Compare the means','Create means as the mean age for each outcome group.',LOAD+"means = df.groupby('outcome')['age'].mean()",[test("means.equals(df.groupby('outcome')['age'].mean())",'Group by outcome and select age before averaging.')],starter=LOAD,hint='Split, select, aggregate.',packages=P),
 code('Keep the denominator','Create summary with rows for outcome and columns n (group size) and age_mean (mean age).',LOAD+"summary = df.groupby('outcome').agg(n=('patient_id','size'), age_mean=('age','mean'))",[test("list(summary.columns) == ['n','age_mean'] and summary['n'].equals(df.groupby('outcome').size())",'Use named aggregation and a row-count denominator.'),test("summary['age_mean'].equals(df.groupby('outcome')['age'].mean())",'Compute a separate mean for each group.')],starter=LOAD,hint='agg accepts output_name=(source_column, operation).',explain="Use n=('patient_id','size') and age_mean=('age','mean').",packages=P),
 code('Complete a bar chart','Create means as mean age by outcome. Plot it as a bar chart in ax, with y-axis label Mean age and x-axis label Outcome.',LOAD+"import matplotlib.pyplot as plt\nmeans = df.groupby('outcome')['age'].mean()\nax = means.plot.bar()\nax.set_ylabel('Mean age')\nax.set_xlabel('Outcome')\nplt.tight_layout()",[test("len(ax.patches) == 2 and ax.get_ylabel() == 'Mean age' and ax.get_xlabel() == 'Outcome'",'Plot two bars and label both axes.'),test("all(abs(bar.get_height()-value)<1e-8 for bar,value in zip(ax.patches,df.groupby('outcome')['age'].mean()))",'Bar heights must come from the grouped data.')],starter=LOAD+'import matplotlib.pyplot as plt\n',hint='means.plot.bar() returns the axes.',packages=PM),
 audit('A measurement count is not a patient count','Create counts with the number of rows in each outcome group, including rows with missing baseline_score.',LOAD+"counts = df.groupby('outcome')['baseline_score'].count()",LOAD+"counts = df.groupby('outcome').size()",[test("counts.equals(df.groupby('outcome').size())",'count() excludes missing baseline scores; size() counts rows.')],'The denominator must match the question.',packages=P)
 ],'An average needs its group size and missingness context.','The lab can now compare groups. A glowing bar is persuasive, so make sure its height and denominator actually answer the intended question.',
 {'title':'Mean is only one summary','text':'Outliers and skew can make a mean incomplete. Median and spread are useful next steps, but neither turns a descriptive comparison into a causal result.','experiment':'Compare mean and median baseline scores by outcome.'},'dataframe')

lesson(29,'Join without losing people','merge',
 ['merge combines tables using explicit keys.','A left join keeps every row of the left table.','Use validate="one_to_one" when each key should be unique.','Duplicate keys can multiply rows.','Check key uniqueness, row counts, and unmatched records.'],
 LOAD+"labs = pd.read_csv('labs.csv')\nmerged = df.merge(labs, on='patient_id', how='left', validate='one_to_one')",[
 code('Match the lab records','Read patients.csv as df and labs.csv as labs. Left-merge on patient_id into merged, validating a one-to-one relationship.',LOAD+"labs = pd.read_csv('labs.csv')\nmerged = df.merge(labs, on='patient_id', how='left', validate='one_to_one')",[test("len(merged) == 240 and 'marker_a' in merged.columns",'The merged table should preserve all patients and include marker_a.'),test("merged.equals(df.merge(labs,on='patient_id',how='left',validate='one_to_one'))",'Join by patient_id, not row position.')],starter=LOAD,hint='Specify on, how, and validate explicitly.',packages=P),
 code('Check the join key','Read labs.csv as labs. Set unique_keys to whether patient_id is unique.',"import pandas as pd\nlabs = pd.read_csv('labs.csv')\nunique_keys = bool(labs['patient_id'].is_unique)",[test('unique_keys is True','Inspect the actual key column.')],starter='import pandas as pd\n',hint='Series.is_unique checks duplicates.',packages=P),
 code('Detect duplicated keys','Read labs-duplicates.csv as labs. Set duplicate_count to the number of duplicated patient_id entries beyond their first occurrence.',"import pandas as pd\nlabs = pd.read_csv('labs-duplicates.csv')\nduplicate_count = int(labs['patient_id'].duplicated().sum())",[test('duplicate_count == 1','There is one extra copy of a patient ID.')],starter='import pandas as pd\n',hint='duplicated() marks repeat occurrences.',packages=P),
 code('Check the row count','Join the clean tables into merged. Set row_count_ok to whether its length equals the original cohort length.',LOAD+"labs = pd.read_csv('labs.csv')\nmerged = df.merge(labs,on='patient_id',how='left',validate='one_to_one')\nrow_count_ok = len(merged) == len(df)",[test('row_count_ok is True and len(merged) == 240','A one-to-one left join should preserve row count.')],starter=LOAD,hint='Count before and after the join.',packages=P),
 audit('A join that multiplies patients','The duplicate fixture must be rejected as unsafe for a one-to-one join. Set safe_to_merge to False based on the key uniqueness check.',LOAD+"labs = pd.read_csv('labs-duplicates.csv')\nmerged = df.merge(labs,on='patient_id',how='left')\nsafe_to_merge = len(merged) >= len(df)",LOAD+"labs = pd.read_csv('labs-duplicates.csv')\nsafe_to_merge = bool(df['patient_id'].is_unique and labs['patient_id'].is_unique)",[test('safe_to_merge is False','More rows do not prove a safe join; check key uniqueness.')],'Check the relationship before merging, not whether the result looks full.',packages=P)
 ],'A successful join can still corrupt a denominator. Validate the relationship.','Two datasets approach the lab from different islands. Join them by identity, not visual position, and refuse a relationship that duplicates the people you meant to count.',
 {'title':'Never casually drop duplicate IDs','text':'A duplicate ID might represent repeated visits rather than a mistake. Decide the intended unit of analysis before aggregating or dropping anything.','experiment':'Explain why one row per patient and one row per visit require different joins.'},'dataframe')

FINAL_SUM="summary = df.groupby('outcome').agg(n=('patient_id','size'), age_mean=('age','mean'), baseline_mean=('baseline_score','mean'), missing_baseline=('baseline_score',lambda s: int(s.isna().sum())))\n"
lesson(30,'The evidence engine','world5-boss',
 ['Question: how do baseline characteristics differ by outcome?','Audit rows, keys, missingness, and the join first.','Compare group sizes and means on a common definition.','Show a labeled chart, then describe its limits.','Synthetic associations are not clinical evidence or causal effects.'],
 LOAD+FINAL_SUM+'print(summary)',[
 code('Audit the cohort','Load patients.csv. Set n to row count, unique_ids to key uniqueness, and missing to missing baseline_score count.',LOAD+"n = len(df)\nunique_ids = bool(df['patient_id'].is_unique)\nmissing = int(df['baseline_score'].isna().sum())",[test('n == 240 and unique_ids is True','Confirm all 240 distinct synthetic records.'),test("missing == int(df['baseline_score'].isna().sum())",'Count the missing baseline values explicitly.')],starter=LOAD,hint='Start with size, keys, and missingness.',packages=P),
 code('Compare outcome groups','Create summary indexed by outcome with n, age_mean, baseline_mean, and missing_baseline. Use size for n.',LOAD+FINAL_SUM,[test("list(summary.columns) == ['n','age_mean','baseline_mean','missing_baseline']",'Keep the requested four summaries.'),test("summary['n'].equals(df.groupby('outcome').size()) and summary['age_mean'].equals(df.groupby('outcome')['age'].mean()) and summary['baseline_mean'].equals(df.groupby('outcome')['baseline_score'].mean())",'Compute separate summaries for each group.'),test("summary['missing_baseline'].tolist() == df.groupby('outcome')['baseline_score'].apply(lambda s:int(s.isna().sum())).tolist()",'Keep each group\'s missing count visible.')],starter=LOAD,hint='Use named aggregation; missingness needs a small lambda.',explain="Use .agg(n=('patient_id','size'), age_mean=('age','mean'), baseline_mean=('baseline_score','mean'), missing_baseline=('baseline_score', lambda s: int(s.isna().sum()))).",packages=P),
 code('Build the evidence chart','Plot mean baseline_score by outcome as two bars in ax. Label the y-axis Mean baseline score and x-axis Outcome.',LOAD+"import matplotlib.pyplot as plt\nmeans = df.groupby('outcome')['baseline_score'].mean()\nax = means.plot.bar()\nax.set_ylabel('Mean baseline score')\nax.set_xlabel('Outcome')\nplt.tight_layout()",[test("len(ax.patches) == 2 and ax.get_ylabel() == 'Mean baseline score' and ax.get_xlabel() == 'Outcome'",'Use two bars with clear labels.'),test("all(abs(bar.get_height()-value)<1e-8 for bar,value in zip(ax.patches,df.groupby('outcome')['baseline_score'].mean()))",'Plot the grouped baseline means, not counts.')],starter=LOAD+'import matplotlib.pyplot as plt\n',hint='Choose the measured column before calling mean().',packages=PM),
 code('Assemble the analysis','Load and validate the patient/lab join into merged. Create the four-column summary from the patient table. Set conclusion to a sentence containing synthetic, association, and not causal; then print the summary and conclusion.',LOAD+"labs = pd.read_csv('labs.csv')\nmerged = df.merge(labs,on='patient_id',how='left',validate='one_to_one')\n"+FINAL_SUM+"conclusion = 'This synthetic comparison shows association, not causal evidence.'\nprint(summary)\nprint(conclusion)",[test("len(merged) == 240 and 'marker_a' in merged.columns",'Validate the patient-to-lab relationship.'),test("summary['n'].sum() == 240 and summary['baseline_mean'].equals(df.groupby('outcome')['baseline_score'].mean())",'Base the comparison on the complete cohort.'),test("all(word in conclusion.lower() for word in ['synthetic','association','not causal'])",'State that the synthetic association is not causal evidence.')],starter=LOAD,hint='Combine inspection, validated joining, grouping, and a cautious interpretation.',explain='The interpretation check is a vocabulary scaffold, not an automated assessment of clinical reasoning.',packages=P),
 audit('One denominator for two groups','Compute means as a Series of mean baseline_score within each outcome group, excluding only missing baseline measurements from each mean.',LOAD+"means = df.groupby('outcome')['baseline_score'].sum() / len(df)",LOAD+"means = df.groupby('outcome')['baseline_score'].mean()",[test("means.equals(df.groupby('outcome')['baseline_score'].mean())",'Each mean needs its own nonmissing group denominator, not the entire cohort.')],'A total divided by the wrong count can still look believable.',packages=P)
 ],'You can load, inspect, filter, group, join, and question a small analysis.','The Evidence Engine does not need a dramatic claim. It needs an answer whose rows, denominators, and limitations survive inspection. That is the final boss.',
 {'title':'The next island is experimental design','text':'Before modeling clinical data, learn study design, leakage, confounding, validation, uncertainty, and governance. This course builds the coding floor, not clinical authority.','experiment':'Write one descriptive question the dataset can answer and one causal question it cannot.'},'dataframe')

# Deterministic, wholly fictional practice records; no patient source exists.
rng=random.Random(7319)
data=ROOT/'public'/'data'
data.mkdir(parents=True,exist_ok=True)
patients=[]
labs=[]
for i in range(1,241):
 age=35+(i*7)%51
 score=round(max(8,min(96,40+0.35*(age-50)+rng.gauss(0,14))),1)
 outcome=int(score + rng.gauss(0,15) + .12*(age-55) > 45)
 patients.append({'patient_id':f'SYN{i:03d}','age':age,'baseline_score':'' if i%17==0 else score,'followup_days':30+(i*13)%336,'outcome':outcome})
 labs.append({'patient_id':f'SYN{i:03d}','marker_a':'' if i%23==0 else round(10+score*.25+rng.gauss(0,3),2)})
for filename,records in [('patients.csv',patients),('labs.csv',labs),('labs-duplicates.csv',labs+[labs[0]])]:
 with (data/filename).open('w',newline='') as f:
  w=csv.DictWriter(f,fieldnames=list(records[0]));w.writeheader();w.writerows(records)
(data/'supplies.csv').write_text('item,units\ncell,4\ncrystal,6\ncoil,3\n')
(data/'bad-values.csv').write_text('patient_id,measurement\nSYN001,12\nSYN002,unknown\nSYN003,\n')
(ROOT/'public'/'lessons.json').write_text(json.dumps({'schemaVersion':1,'worlds':worlds,'lessons':lessons},indent=2))
print(f'Wrote {len(lessons)} missions / {sum(len(l["challenges"]) for l in lessons)} challenges.')
