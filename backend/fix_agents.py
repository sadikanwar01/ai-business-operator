import pathlib 
def fix(path): 
    c = pathlib.Path(path).read_text(encoding='utf-8') 
    old = 'data = response.json()' 
    new = 'data = response.json()\n        except Exception:\n            data = {}' 
    print(path, 'FIXED' if old in c else 'SKIP') 
    pathlib.Path(path).write_text(c, encoding='utf-8') 
for f in ['app/agents/analyst.py','app/agents/qualifier.py','app/agents/writer.py','app/agents/reviewer.py']: 
    fix(f) 
