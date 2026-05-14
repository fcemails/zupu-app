import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'
import bcrypt from 'bcryptjs'

const dbPath = path.resolve(process.cwd(), 'prisma/dev.db')
const adapter = new PrismaBetterSqlite3({ url: dbPath })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Demo user — 族谱管理员
  const pw = await bcrypt.hash('zupu2024', 12)
  const user = await prisma.user.upsert({
    where: { email: 'admin@zupu.local' },
    update: {},
    create: { name: '李文远', email: 'admin@zupu.local', password: pw },
  })

  // 李氏陇西堂
  const family = await prisma.family.upsert({
    where: { id: 'fam_longxi' },
    update: {},
    create: {
      id: 'fam_longxi',
      surname: '李',
      tang: '陇西堂',
      region: '蜀眉柳溪',
      era: '元末明初',
      motto: '明德惟馨，积善余庆，耕读传家，忠孝为本',
      zibei: '永世昌隆显文运振家声',
      access: 'semi',
      accessList: {
        create: { userId: user.id, role: 'owner' },
      },
    },
  })

  // Helper to upsert a person
  async function person(id: string, data: {
    name: string; zi?: string; hao?: string; sex?: string; gen: number;
    branch?: string; birth?: string; death?: string; lifespan?: string;
    title?: string; bio?: string; burial?: string; deceased?: boolean;
  }) {
    return prisma.person.upsert({
      where: { id },
      update: {},
      create: { id, familyId: family.id, sex: 'M', ...data },
    })
  }

  // ── 一世 ──
  const p1 = await person('p1', {
    gen: 1, branch: '本支', name: '李永昌', zi: '本立', hao: '陇西公',
    birth: '元至正七年(1347)', death: '明永乐三年(1405)', lifespan: '寿五十八',
    title: '始迁祖 · 处士', deceased: true,
    burial: '陇西县东郊祖茔',
    bio: '公讳永昌，字本立，号陇西公。元末避乱自陇西郡迁居蜀中眉山，开基立业，垦田二百亩，开宗祠于柳溪。性敦厚，乐善好施，乡里推为长者。生于元至正七年丁亥四月初九，殁于明永乐三年乙酉冬十一月廿三。',
  })

  // ── 二世 ──
  const p2 = await person('p2', {
    gen: 2, branch: '长房', name: '李世仁', zi: '志远', hao: '柳溪',
    birth: '明洪武四年(1371)', death: '明宣德元年(1426)', lifespan: '寿五十六',
    title: '邑庠生', deceased: true, burial: '柳溪松山西麓',
    bio: '公讳世仁，字志远，永昌公长子。少颖悟，年十六入邑庠为生员。秉父志，扩田为五百亩，立家训十六条曰《柳溪遗训》，至今族人共遵之。',
  })
  const p3 = await person('p3', {
    gen: 2, branch: '二房', name: '李世义', zi: '志和',
    birth: '明洪武八年(1375)', death: '明宣德七年(1432)', lifespan: '寿五十八',
    title: '处士', deceased: true, burial: '柳溪东山',
    bio: '公讳世义，字志和，永昌公次子。性恬退，不慕仕进，居乡课农，与兄世仁分立两房，开二房之始。',
  })

  // ── 三世 ──
  const p4 = await person('p4', {
    gen: 3, branch: '长房·长支', name: '李昌明', zi: '希贤',
    birth: '明永乐二年(1404)', death: '明天顺六年(1462)', lifespan: '寿五十九',
    title: '庠生·乡饮宾', deceased: true,
    bio: '公讳昌明，字希贤。秉性温厚，主修《柳溪李氏家谱》初编，开族谱之先河。',
  })
  const p5 = await person('p5', {
    gen: 3, branch: '长房·二支', name: '李昌瑞', zi: '兆吉',
    birth: '明永乐九年(1411)', death: '明成化四年(1468)', lifespan: '寿五十八',
    title: '邑廪生', deceased: true,
  })
  const p6 = await person('p6', {
    gen: 3, branch: '二房·长支', name: '李昌智', zi: '克明',
    birth: '明永乐十五年(1417)', death: '明弘治元年(1488)', lifespan: '寿七十二',
    title: '处士', deceased: true,
  })
  const p7 = await person('p7', {
    gen: 3, branch: '二房·二支', name: '李昌信', zi: '可孚',
    birth: '明宣德二年(1427)', death: '明弘治十年(1497)', lifespan: '寿七十一',
    title: '县丞', deceased: true,
  })

  // ── 四世 ──
  const p8 = await person('p8', {
    gen: 4, branch: '长房·长支', name: '李隆山', zi: '景岳', hao: '松石',
    birth: '明正统八年(1443)', death: '明正德五年(1510)', lifespan: '寿六十八',
    title: '举人·知县', deceased: true,
    bio: '公讳隆山，字景岳，号松石。明成化十一年中举人，授四川富顺县知县，有政声，民立去思碑。',
  })
  const p9 = await person('p9', {
    gen: 4, branch: '长房·长支', name: '李隆川', zi: '景川',
    birth: '明景泰六年(1455)', death: '明正德十一年(1516)', lifespan: '寿六十二',
    title: '太学生', deceased: true,
  })
  const p10 = await person('p10', {
    gen: 4, branch: '长房·二支', name: '李隆德', zi: '德甫',
    birth: '明天顺四年(1460)', death: '明正德十年(1515)', lifespan: '寿五十六',
    title: '处士', deceased: true,
  })
  const p11 = await person('p11', {
    gen: 4, branch: '二房·长支', name: '李隆海', zi: '海若',
    birth: '明成化二年(1466)', death: '明嘉靖三年(1524)', lifespan: '寿五十九',
    title: '邑廪生', deceased: true,
  })
  const p12 = await person('p12', {
    gen: 4, branch: '二房·长支', name: '李隆江', zi: '汝霖',
    birth: '明成化八年(1472)', death: '明嘉靖九年(1530)', lifespan: '寿五十九',
    title: '处士', deceased: true,
  })
  const p13 = await person('p13', {
    gen: 4, branch: '二房·二支', name: '李隆河', zi: '汝霁',
    birth: '明成化十五年(1479)', death: '明嘉靖二十一年(1542)', lifespan: '寿六十四',
    title: '武略将军', deceased: true,
  })

  // ── 五世 ──
  const p14 = await person('p14', {
    gen: 5, branch: '长房·长支', name: '李显宗', zi: '宗周', hao: '虞山',
    birth: '明成化十五年(1479)', death: '明嘉靖三十年(1551)', lifespan: '寿七十三',
    title: '进士·翰林院编修', deceased: true,
    bio: '公讳显宗，字宗周，号虞山。明正德六年(1511)进士，选翰林院庶吉士，授编修。后转南京吏部主事，以直谏忤权贵罢归。著《虞山文集》十二卷传世。',
  })
  const p15 = await person('p15', {
    gen: 5, branch: '长房·长支', name: '李显玉', zi: '韫之', sex: 'F',
    birth: '明弘治三年(1490)', death: '明嘉靖十九年(1540)', lifespan: '寿五十一',
    title: '——', deceased: true,
  })
  const p16 = await person('p16', {
    gen: 5, branch: '长房·长支', name: '李显文', zi: '若虚',
    birth: '明弘治八年(1495)', death: '明嘉靖二十六年(1547)', lifespan: '寿五十三',
    title: '岁贡生', deceased: true,
  })

  // ── 关系 ──
  const rels: Array<{ parentId: string; childId: string }> = [
    { parentId: p1.id, childId: p2.id },
    { parentId: p1.id, childId: p3.id },
    { parentId: p2.id, childId: p4.id },
    { parentId: p2.id, childId: p5.id },
    { parentId: p3.id, childId: p6.id },
    { parentId: p3.id, childId: p7.id },
    { parentId: p4.id, childId: p8.id },
    { parentId: p4.id, childId: p9.id },
    { parentId: p5.id, childId: p10.id },
    { parentId: p6.id, childId: p11.id },
    { parentId: p6.id, childId: p12.id },
    { parentId: p7.id, childId: p13.id },
    { parentId: p8.id, childId: p14.id },
    { parentId: p8.id, childId: p15.id },
    { parentId: p8.id, childId: p16.id },
  ]
  for (const rel of rels) {
    await prisma.relationship.upsert({
      where: { parentId_childId: rel },
      update: {},
      create: rel,
    })
  }

  // ── 大事记 ──
  const events = [
    { id: 'e1', year: 1368, title: '始祖迁居蜀中', desc: '永昌公自陇西郡避元末战乱，携家眷迁居蜀中眉山柳溪，垦田二百亩，开基立业。', major: true, actors: JSON.stringify(['李永昌']) },
    { id: 'e2', year: 1395, title: '建立柳溪宗祠', desc: '永昌公主持修建柳溪李氏宗祠，奉始迁祖牌位，立祭祖之制。', major: true, actors: JSON.stringify(['李永昌']) },
    { id: 'e3', year: 1430, title: '立柳溪遗训', desc: '世仁公撰《柳溪遗训》十六条，训诫子孙忠孝仁义、耕读传家，成为族规之本。', major: true, actors: JSON.stringify(['李世仁']) },
    { id: 'e4', year: 1460, title: '修谱初编', desc: '昌明公主持修纂《柳溪李氏家谱》初编，收录五世族人，开族谱之先河。', major: false, actors: JSON.stringify(['李昌明']) },
    { id: 'e5', year: 1511, title: '显宗公登进士第', desc: '五世显宗公李宗周，于明正德六年辛未科登进士第，选翰林院庶吉士，授编修，为家族科举仕途之最高成就。', major: true, actors: JSON.stringify(['李显宗']) },
    { id: 'e6', year: 1545, title: '续修族谱', desc: '五世显文公主持续修族谱，增补四、五世族人，完善房支体系。', major: false, actors: JSON.stringify(['李显文']) },
    { id: 'e7', year: 1580, title: '扩建宗祠', desc: '六世族人合力扩建宗祠，增设寝堂、厢房，并立始迁祖画像，定春秋二祭之制。', major: false, actors: JSON.stringify([]) },
    { id: 'e8', year: 1644, title: '明清鼎革，族人离散', desc: '明清鼎革之际，部分族人流离迁徙，长房一支迁往成都，二房一支迁居乐山，族谱记载渐有缺失。', major: true, actors: JSON.stringify([]) },
    { id: 'e9', year: 2024, title: '数字族谱立项', desc: '族人倡议建立数字化族谱平台，收集整理历代族谱资料，以数字技术传承家族文化。', major: true, actors: JSON.stringify(['李文远']) },
  ]
  for (const ev of events) {
    await prisma.familyEvent.upsert({
      where: { id: ev.id },
      update: {},
      create: { ...ev, familyId: family.id },
    })
  }

  console.log('✓ Seed complete')
  console.log('  Demo login: admin@zupu.local / zupu2024')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
