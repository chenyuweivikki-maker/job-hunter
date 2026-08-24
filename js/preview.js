/* ============ TailorCV resume renderer (简介·宽排版 default) ============ */
(function (global) {
  'use strict';

  /* ---- mark JD-matching terms in a piece of text ---- */
  function markTerms(text, terms) {
    text = String(text || '');
    if (!terms || !terms.length) return TailorCV.esc(text);
    var uniq = [];
    terms.forEach(function (t) { if (t && uniq.indexOf(t) === -1) uniq.push(t); });
    uniq.sort(function (a, b) { return b.length - a.length; });

    var ranges = [];
    uniq.forEach(function (t) {
      if (t.length < 2) return;
      var isAscii = /^[\x20-\x7e]+$/.test(t);
      if (isAscii) {
        var re = new RegExp('(^|[^a-z0-9])(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')($|[^a-z0-9])', 'gi');
        var m;
        while ((m = re.exec(text)) !== null) {
          ranges.push([m.index + m[1].length, m.index + m[1].length + t.length]);
          re.lastIndex = m.index + m[1].length + 1;
        }
      } else {
        var idx = 0;
        while ((idx = text.indexOf(t, idx)) !== -1) {
          ranges.push([idx, idx + t.length]);
          idx += t.length;
        }
      }
    });
    if (!ranges.length) return TailorCV.esc(text);

    ranges.sort(function (a, b) { return a[0] - b[0] || b[1] - a[1]; });
    var merged = [];
    ranges.forEach(function (r) {
      var last = merged[merged.length - 1];
      if (last && r[0] <= last[1]) { last[1] = Math.max(last[1], r[1]); }
      else merged.push(r.slice());
    });

    var html = '', pos = 0;
    merged.forEach(function (r) {
      html += TailorCV.esc(text.slice(pos, r[0]));
      html += '<mark>' + TailorCV.esc(text.slice(r[0], r[1])) + '</mark>';
      pos = r[1];
    });
    html += TailorCV.esc(text.slice(pos));
    return html;
  }

  function fmtRange(start, endText) {
    var s = start ? start : '';
    var e = endText ? endText : '';
    if (s && e) return s + ' ~ ' + e;
    return s || e || '';
  }

  function contactLine(model) {
    var parts = [];
    if (model.header.phone) parts.push(model.header.phone);
    if (model.header.email) parts.push(model.header.email);
    if (model.header.city) parts.push(model.header.city);
    return parts.map(TailorCV.esc).join('<span class="sep">|</span>');
  }

  function intentLine(model) {
    var parts = [];
    if (model.header.targetPosition) parts.push('求职意向：' + TailorCV.esc(model.header.targetPosition));
    if (model.header.targetSalary) parts.push('期望薪资：' + TailorCV.esc(model.header.targetSalary));
    return parts.join('　·　');
  }

  function jobHTML(job, terms) {
    var name = TailorCV.esc(job.company || '');
    var title = job.title ? '<span class="r-job-title"> · ' + TailorCV.esc(job.title) + '</span>' : '';
    var industry = job.industry ? '<div class="r-company-sub">' + TailorCV.esc(job.industry) + '</div>' : '';
    var date = fmtRange(job.start, job.endText) ? '<span class="r-job-date">' + TailorCV.esc(fmtRange(job.start, job.endText)) + '</span>' : '';
    var lis = '';
    (job.bullets || []).forEach(function (b) {
      var pending = b.status === 'pending' ? '<span class="r-pending">待确认</span>' : '';
      lis += '<li>' + markTerms(b.text, terms) + pending + '</li>';
    });
    if (!lis && job.noBullets) lis = '<li class="r-empty-hint">（该段经历未填写要点，可在资料库补充）</li>';
    var ul = lis ? '<ul class="r-bullets">' + lis + '</ul>' : '';
    return '<div class="r-job"><div class="r-job-line"><span class="r-job-name">' + name + title + '</span>' + date + '</div>' + industry + ul + '</div>';
  }

  function eduHTML(edu) {
    if (!edu.length) return '';
    var lis = edu.map(function (e) {
      var main = [TailorCV.esc(e.school), TailorCV.esc(e.degree), TailorCV.esc(e.major)].filter(Boolean).join(' · ');
      var date = fmtRange(e.start, e.end) ? '<span class="r-job-date">' + TailorCV.esc(fmtRange(e.start, e.end)) + '</span>' : '';
      var note = e.note ? '<div class="r-company-sub">' + TailorCV.esc(e.note) + '</div>' : '';
      return '<div class="r-job"><div class="r-job-line"><span class="r-job-name">' + main + '</span>' + date + '</div>' + note + '</div>';
    }).join('');
    return lis;
  }

  function skillHTML(skills, cls) {
    if (!skills || !skills.length) return '<span class="r-empty-hint">（未填写技能）</span>';
    return '<div class="r-skill-tags">' + skills.map(function (s) {
      return '<span class="r-skill' + (s.hot ? ' hot' : '') + '">' + TailorCV.esc(s.name) + '</span>';
    }).join('') + '</div>';
  }

  function metaLine(model) {
    var mode = model.meta.mode === 'llm' ? 'LLM 深度改写' : '本地智能适配';
    return '由 TailorCV 生成 · ' + model.meta.generatedAt + ' · ' + mode +
      (model.meta.coverageRate != null ? ' · JD 关键词覆盖率 ' + model.meta.coverageRate + '%' : '');
  }

  /* ---- render to HTML, style: wide | classic | modern | dachang | kendall | macchiato ---- */
  var EN_SECTION = { '自我评价': 'SUMMARY', '工作经历': 'EXPERIENCE', '项目经历': 'PROJECTS', '教育背景': 'EDUCATION', '专业技能': 'SKILLS' };
  var secHeadWith = function (t, en) {
    return '<div class="r-sec-h">' + t + (en ? ' <span class="r-sec-en">' + en + '</span>' : '') + '</div>';
  };
  function renderResume(model, style) {
    var cls = style === 'classic' ? 'res-classic' : (style === 'modern' ? 'res-modern' : (style === 'dachang' ? 'res-dachang' : (style === 'kendall' ? 'res-kendall' : (style === 'macchiato' ? 'res-macchiato' : 'res-wide'))));
    var terms = model.coverage ? model.coverage.matched : [];
    var name = model.header.name || '（姓名未填写）';
    var contact = contactLine(model);
    var intent = intentLine(model);

    var secHead = function (t) { return '<div class="r-sec-h">' + t + '</div>'; };
    var workHTML = model.work.map(function (j) { return jobHTML(j, terms); }).join('');
    var projHTML = model.projects.map(function (p) {
      var head = TailorCV.esc(p.name) + (p.role ? ' <span class="r-job-title">· ' + TailorCV.esc(p.role) + '</span>' : '');
      var date = fmtRange(p.start, p.end) ? '<span class="r-job-date">' + TailorCV.esc(fmtRange(p.start, p.end)) + '</span>' : '';
      var desc = p.desc ? '<div class="r-company-sub">' + TailorCV.esc(p.desc) + '</div>' : '';
      var lis = (p.bullets || []).map(function (b) { return '<li>' + markTerms(b, terms) + '</li>'; }).join('');
      return '<div class="r-job"><div class="r-job-line"><span class="r-job-name">' + head + '</span>' + date + '</div>' + desc +
        (lis ? '<ul class="r-bullets">' + lis + '</ul>' : '') + '</div>';
    }).join('');
    var eduHTMLstr = eduHTML(model.education);

    if (cls === 'res-modern') {
      var rail = '';
      rail += '<div class="r-rail-h">联系方式</div>' + (contact ? contact : '—');
      if (intent) rail += '<div class="r-rail-h">求职意向</div>' + intent;
      rail += '<div class="r-rail-h">专业技能</div>';
      (model.skills || []).forEach(function (s) {
        rail += '<span class="r-skill' + (s.hot ? ' hot' : '') + '">' + TailorCV.esc(s.name) + '</span>';
      });
      var main = '';
      main += '<div class="r-name">' + TailorCV.esc(name) + '</div>' + (contact ? '<div class="r-contact">' + contact + '</div>' : '');
      main += secHead('自我评价') + '<div class="r-summary">' + TailorCV.esc(model.summary) + '</div>';
      main += secHead('工作经历') + workHTML;
      if (projHTML) main += secHead('项目经历') + projHTML;
      if (eduHTMLstr) main += secHead('教育背景') + eduHTMLstr;
      return '<div class="' + cls + '"><div class="r-rail">' + rail + '</div><div class="r-main">' + main + '</div></div>' + metaTag(model);
    }

    if (cls === 'res-dachang') {
      var contactSpans = '';
      [model.header.phone, model.header.email, model.header.city].filter(Boolean).forEach(function (c) {
        contactSpans += '<span>' + TailorCV.esc(c) + '</span>';
      });
      var dHead = '<div class="r-head"><div class="r-identity"><h1>' + TailorCV.esc(name) + '</h1>' +
        (model.header.targetPosition ? '<p class="r-headline">' + TailorCV.esc(model.header.targetPosition) + '</p>' : '') +
        (contactSpans ? '<div class="r-contact">' + contactSpans + '</div>' : '') +
        '</div><div class="r-photo">证件照<br>（可选）</div></div>';
      var dBullets = function (bullets, terms2) {
        var lis = '';
        (bullets || []).forEach(function (b) {
          var pending = (b && b.status === 'pending') ? '<span class="r-pending">待确认</span>' : '';
          lis += '<li>' + markTerms(typeof b === 'string' ? b : b.text, terms2) + pending + '</li>';
        });
        return lis ? '<ul class="r-bullets">' + lis + '</ul>' : '';
      };
      var dWork = model.work.map(function (j) {
        var date = fmtRange(j.start, j.endText) ? '<span class="r-job-date">' + TailorCV.esc(fmtRange(j.start, j.endText)) + '</span>' : '';
        return '<div class="r-job"><div class="r-job-line">' + date +
          '<span class="r-job-name">' + TailorCV.esc(j.company) + '</span>' +
          '<span class="r-job-title">' + TailorCV.esc(j.title) + '</span></div>' +
          (j.industry ? '<div class="r-company-sub">' + TailorCV.esc(j.industry) + '</div>' : '') +
          dBullets(j.bullets, terms) + '</div>';
      }).join('');
      var dProj = model.projects.map(function (p) {
        var date = fmtRange(p.start, p.end) ? '<span class="r-job-date">' + TailorCV.esc(fmtRange(p.start, p.end)) + '</span>' : '';
        var head = '<span class="r-job-name">' + TailorCV.esc(p.name) + '</span><span class="r-job-title">' + TailorCV.esc(p.role) + '</span>';
        return '<div class="r-job"><div class="r-job-line">' + date + head + '</div>' +
          (p.desc ? '<div class="r-company-sub">' + TailorCV.esc(p.desc) + '</div>' : '') + dBullets(p.bullets, terms) + '</div>';
      }).join('');
      var dEdu = model.education.map(function (e) {
        var date = fmtRange(e.start, e.end) ? '<span class="r-job-date">' + TailorCV.esc(fmtRange(e.start, e.end)) + '</span>' : '';
        return '<div class="r-job"><div class="r-job-line">' + date +
          '<span class="r-job-name">' + TailorCV.esc(e.school) + '</span>' +
          '<span class="r-job-title">' + TailorCV.esc([e.degree, e.major].filter(Boolean).join(' · ')) + '</span></div></div>';
      }).join('');
      var dSkill = '<div class="r-skill-tags">' + (model.skills || []).map(function (s) {
        return '<span class="r-skill' + (s.hot ? ' hot' : '') + '">' + TailorCV.esc(s.name) + '</span>';
      }).join('') + '</div>';
      var dBody = '';
      dBody += dHead;
      dBody += '<div class="r-sec">' + secHeadWith('自我评价', 'SUMMARY') + '<div class="r-summary">' + TailorCV.esc(model.summary) + '</div></div>';
      dBody += '<div class="r-sec">' + secHeadWith('工作经历', 'EXPERIENCE') + dWork + '</div>';
      if (dProj) dBody += '<div class="r-sec">' + secHeadWith('项目经历', 'PROJECTS') + dProj + '</div>';
      if (dEdu) dBody += '<div class="r-sec">' + secHeadWith('教育背景', 'EDUCATION') + dEdu + '</div>';
      if (dSkill) dBody += '<div class="r-sec">' + secHeadWith('专业技能', 'SKILLS') + dSkill + '</div>';
      return '<div class="' + cls + '">' + dBody + '</div>' + metaTag(model);
    }

    // ---- kendall：蓝调时间轴（移植自 LinuxBozo/jsonresume-theme-kendall, MIT） ----
    if (cls === 'res-kendall') {
      var kPending = function (b) { return b && b.status === 'pending' ? '<span class="r-pending">待确认</span>' : ''; };
      var kBullets = function (bullets) {
        var lis = (bullets || []).map(function (b) {
          return '<li>' + markTerms(typeof b === 'string' ? b : b.text, terms) + kPending(b) + '</li>';
        }).join('');
        return lis ? '<ul class="k-bullets">' + lis + '</ul>' : '';
      };
      var kHead = '<div class="k-head"><div class="k-avatar">' +
        (name === '（姓名未填写）' ? '?' : TailorCV.esc(name.slice(0, 1))) + '</div><div class="k-id">' +
        '<div class="k-name">' + TailorCV.esc(name) + '</div>' +
        (model.header.targetPosition ? '<div class="k-target">' + TailorCV.esc(model.header.targetPosition) + '</div>' : '') +
        '<div class="k-contact">' + contact + '</div></div></div>';
      var kJob = function (j) {
        var date = fmtRange(j.start, j.endText);
        return '<div class="k-job"><div class="k-where">' + TailorCV.esc(j.company) + '</div>' +
          '<div class="k-meta">' + TailorCV.esc(j.title) + (date ? '　<span>' + TailorCV.esc(date) + '</span>' : '') + '</div>' +
          kBullets(j.bullets) + '</div>';
      };
      var kBody = kHead;
      kBody += '<div class="k-box">' + '<h2 class="k-sec-h">自我评价</h2>' + '<div class="k-summary">' + TailorCV.esc(model.summary) + '</div></div>';
      kBody += '<div class="k-box"><h2 class="k-sec-h">工作经历</h2>' + model.work.map(kJob).join('') + '</div>';
      if (model.projects.length) {
        kBody += '<div class="k-box"><h2 class="k-sec-h">项目经历</h2>' + model.projects.map(function (p) {
          var date = fmtRange(p.start, p.end);
          return '<div class="k-job"><div class="k-where">' + TailorCV.esc(p.name) + '</div>' +
            '<div class="k-meta">' + TailorCV.esc(p.role) + (date ? '　<span>' + TailorCV.esc(date) + '</span>' : '') + '</div>' +
            (p.desc ? '<div class="k-desc">' + TailorCV.esc(p.desc) + '</div>' : '') + kBullets(p.bullets) + '</div>';
        }).join('') + '</div>';
      }
      if (model.education.length) {
        kBody += '<div class="k-box"><h2 class="k-sec-h">教育背景</h2><div class="k-timeline">' + model.education.map(function (e) {
          return '<div class="k-tl-item"><span class="k-tl-year">' + TailorCV.esc(fmtRange(e.start, e.end)) + '</span>' +
            '<span class="k-tl-desc">' + TailorCV.esc([e.school, e.degree, e.major].filter(Boolean).join(' · ')) + '</span></div>';
        }).join('') + '</div></div>';
      }
      if (model.skills.length) {
        kBody += '<div class="k-box"><h2 class="k-sec-h">专业技能</h2><div class="k-chips">' + (model.skills || []).map(function (s) {
          return '<span class="k-chip' + (s.hot ? ' hot' : '') + '">' + TailorCV.esc(s.name) + '</span>';
        }).join('') + '</div></div>';
      }
      return '<div class="' + cls + '">' + kBody + '</div>' + metaTag(model);
    }

    // ---- macchiato：A4 双栏咖啡风（参考 biosan/jsonresume-theme-macchiato 视觉规格） ----
    if (cls === 'res-macchiato') {
      var mBullets = function (bullets) {
        var lis = (bullets || []).map(function (b) {
          return '<li>' + markTerms(typeof b === 'string' ? b : b.text, terms) + (b && b.status === 'pending' ? '<span class="r-pending">待确认</span>' : '') + '</li>';
        }).join('');
        return lis ? '<ul class="m-bullets">' + lis + '</ul>' : '';
      };
      var mHead = '<div class="m-accent"></div><div class="m-head"><div class="m-avatar">' +
        (name === '（姓名未填写）' ? '?' : TailorCV.esc(name.slice(0, 1))) + '</div><div class="m-id">' +
        '<div class="m-name">' + TailorCV.esc(name) + '</div>' +
        (model.header.targetPosition ? '<div class="m-target">' + TailorCV.esc(model.header.targetPosition) + '</div>' : '') +
        '<div class="m-contact">' + contact + '</div></div></div>';
      var mSec = function (t, c) { return '<div class="m-sec"><h3 class="m-sec-h">' + t + '</h3>' + c + '</div>'; };
      var mMain = '';
      mMain += mSec('自我评价', '<div class="m-summary">' + TailorCV.esc(model.summary) + '</div>');
      mMain += mSec('工作经历', model.work.map(function (j) {
        var date = fmtRange(j.start, j.endText);
        return '<div class="m-job"><div class="m-where">' + TailorCV.esc(j.company) + '</div>' +
          '<div class="m-meta">' + TailorCV.esc(j.title) + (date ? '　<span>' + TailorCV.esc(date) + '</span>' : '') + '</div>' + mBullets(j.bullets) + '</div>';
      }).join(''));
      if (model.projects.length) {
        mMain += mSec('项目经历', model.projects.map(function (p) {
          return '<div class="m-job"><div class="m-where">' + TailorCV.esc(p.name) + '</div>' +
            '<div class="m-meta">' + TailorCV.esc(p.role) + '</div>' + mBullets(p.bullets) + '</div>';
        }).join(''));
      }
      var mSide = '';
      if (model.education.length) {
        mSide += mSec('教育', model.education.map(function (e) {
          return '<div class="m-edu">' + TailorCV.esc(e.school) + '<span>' + TailorCV.esc([e.degree, e.major].filter(Boolean).join(' · ')) + ' · ' + TailorCV.esc(fmtRange(e.start, e.end)) + '</span></div>';
        }).join(''));
      }
      mSide += mSec('技能', '<div class="m-chips">' + (model.skills || []).map(function (s) {
        return '<span class="m-chip' + (s.hot ? ' hot' : '') + '">' + TailorCV.esc(s.name) + '</span>';
      }).join('') + '</div>');
      if (model.header.targetSalary) mSide += mSec('期望', '<div class="m-edu">' + TailorCV.esc(model.header.targetSalary) + '</div>');
      var mBody = mHead + '<div class="m-wrap"><div class="m-main">' + mMain + '</div><div class="m-side">' + mSide + '</div></div>';
      return '<div class="' + cls + '">' + mBody + '</div>' + metaTag(model);
    }

    var body = '';
    body += '<div class="r-head"><div class="r-name">' + TailorCV.esc(name) + '</div><div class="r-contact">' +
      (contact || '—') + (intent ? '<div class="r-intent">' + intent + '</div>' : '') + '</div></div>';
    body += secHead('自我评价') + '<div class="r-summary">' + TailorCV.esc(model.summary) + '</div>';
    body += secHead('工作经历') + workHTML;
    if (projHTML) body += secHead('项目经历') + projHTML;
    if (eduHTMLstr) body += secHead('教育背景') + eduHTMLstr;
    body += secHead('专业技能') + skillHTML(model.skills);
    return '<div class="' + cls + '">' + body + '</div>' + metaTag(model);
  }

  function metaTag(model) {
    return '<div class="r-meta">' + TailorCV.esc(metaLine(model)) + '</div>';
  }

  /* ---- plain-text export ---- */
  function resumeToText(model) {
    var L = [];
    L.push(model.header.name || '');
    var c = [model.header.phone, model.header.email, model.header.city].filter(Boolean).join(' | ');
    if (c) L.push(c);
    var intent = [model.header.targetPosition ? ('求职意向：' + model.header.targetPosition) : '', model.header.targetSalary ? ('期望薪资：' + model.header.targetSalary) : ''].filter(Boolean).join('  ');
    if (intent) L.push(intent);
    L.push('');
    L.push('【自我评价】'); L.push(model.summary); L.push('');
    L.push('【工作经历】');
    model.work.forEach(function (j) {
      L.push((j.company || '') + (j.title ? ' · ' + j.title : '') + (fmtRange(j.start, j.endText) ? '（' + fmtRange(j.start, j.endText) + '）' : ''));
      (j.bullets || []).forEach(function (b) { L.push('· ' + b.text); });
      L.push('');
    });
    if (model.projects.length) {
      L.push('【项目经历】');
      model.projects.forEach(function (p) {
        L.push((p.name || '') + (p.role ? ' · ' + p.role : ''));
        if (p.desc) L.push(p.desc);
        (p.bullets || []).forEach(function (b) { L.push('· ' + b); });
        L.push('');
      });
    }
    if (model.education.length) {
      L.push('【教育背景】');
      model.education.forEach(function (e) {
        L.push([e.school, e.degree, e.major].filter(Boolean).join(' · ') + (fmtRange(e.start, e.end) ? '（' + fmtRange(e.start, e.end) + '）' : ''));
      });
      L.push('');
    }
    if (model.skills.length) L.push('【专业技能】' + model.skills.map(function (s) { return s.name; }).join('、'));
    return L.join('\n');
  }

  /* ---- JSON Resume 导出 (jsonresume.org schema) ---- */
  function resumeToJSON(model) {
    var iso = function (ym) { return ym ? ym + '-01' : ''; };
    var json = {
      $schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/master/schema.json',
      basics: {
        name: model.header.name,
        label: model.header.targetPosition,
        email: model.header.email,
        phone: model.header.phone,
        location: model.header.city ? { city: model.header.city } : undefined,
        summary: model.summary
      },
      work: model.work.map(function (w) {
        return {
          company: w.company, position: w.title,
          startDate: iso(w.start), endDate: w.endText && w.endText !== '至今' ? iso(w.endText) : undefined,
          summary: w.industry || undefined,
          highlights: (w.bullets || []).map(function (b) { return b.text; })
        };
      }),
      education: model.education.map(function (e) {
        return {
          institution: e.school, area: e.major, studyType: e.degree,
          startDate: iso(e.start), endDate: e.end ? iso(e.end) : undefined
        };
      }),
      skills: (model.skills || []).map(function (s) { return { name: s.name }; }),
      projects: model.projects.map(function (p) {
        return {
          name: p.name, role: p.role || undefined,
          startDate: iso(p.start), endDate: p.end ? iso(p.end) : undefined,
          description: p.desc || undefined,
          highlights: (p.bullets || []).slice()
        };
      })
    };
    ['basics', 'work', 'education', 'skills', 'projects'].forEach(function (k) {
      if (Array.isArray(json[k]) && !json[k].length) delete json[k];
    });
    if (json.basics && !json.basics.location) delete json.basics.location;
    return json;
  }

  /* ---- Word(.doc) 导出：HTML 包装，Word 可直接打开 ---- */
  function resumeToDocHTML(model, style) {
    return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>' + TailorCV.esc(model.header.name || 'resume') + ' - 简历</title></head><body>' +
      renderResume(model, style || 'wide') + '</body></html>';
  }

  /* ---- 版本 diff：两个生成模型之间工作经历/摘要/技能的变化 ---- */
  function diffModels(a, b) {
    var out = { summaryChanged: false, skillsAdded: [], skillsRemoved: [], work: [] };
    if (a.summary !== b.summary) out.summaryChanged = true;
    var sa = (a.skills || []).map(function (s) { return s.name; });
    var sb = (b.skills || []).map(function (s) { return s.name; });
    out.skillsAdded = sb.filter(function (s) { return sa.indexOf(s) === -1; });
    out.skillsRemoved = sa.filter(function (s) { return sb.indexOf(s) === -1; });
    var key = function (w) { return (w.company || '') + '|' + (w.title || ''); };
    var mapB = {};
    (b.work || []).forEach(function (w) { mapB[key(w)] = w; });
    (a.work || []).forEach(function (w) {
      var wb = mapB[key(w)];
      var aTxt = (w.bullets || []).map(function (x) { return x.text; });
      var bTxt = wb ? (wb.bullets || []).map(function (x) { return x.text; }) : [];
      var added = bTxt.filter(function (t) { return aTxt.indexOf(t) === -1; });
      var removed = aTxt.filter(function (t) { return bTxt.indexOf(t) === -1; });
      if (added.length || removed.length) {
        out.work.push({ company: w.company, title: w.title, added: added, removed: removed });
      }
    });
    return out;
  }

  var API = { renderResume: renderResume, resumeToText: resumeToText, markTerms: markTerms, resumeToJSON: resumeToJSON, resumeToDocHTML: resumeToDocHTML, diffModels: diffModels };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  global.TailorPreview = API;
})(typeof window !== 'undefined' ? window : globalThis);
