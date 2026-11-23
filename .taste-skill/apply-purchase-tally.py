from pathlib import Path
p=Path('seller.js')
s=p.read_text(encoding='utf-8')
before='''+'</dl></div></section><section class="workspace-panel"><div class="panel-heading"><h2>Recent transactions'''
after='''+'</dl></div></section>'+purchaseTally()+'<section class="workspace-panel"><div class="panel-heading"><h2>Recent transactions'''
if before in s:
    assert s.count(before)==1
    s=s.replace(before,after)
else:
    assert after in s
p.write_text(s,encoding='utf-8')
