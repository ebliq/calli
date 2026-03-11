This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Deploy to EC2

Connect via Session Manager in AWS Console

- in /home/healthcare-genai-app directory gehen
- git status + git pull
- Image build: docker build -t landsberg:1.0.x -f Dockerfile .
  - Version hochzählen aktuell 1.0.6 -> mit docker image ls sieht man die images
- alten container stoppen
- docker ps
- docker stop <container_id>
- neuen container starten:
  - für prod:
    - docker run -p 3000:3000 --detach --env-file .env.production landsberg:1.0.x
  - für dev:
    - docker run -p 3001:3000 --detach --env-file .env.production landsberg:1.0.x

## Einführung von semantic release und Conventional Commits Standards für ECS-CICD

Siehe: [semantic-release](https://github.com/semantic-release/semantic-release)

### Conventional Commits Standards:

| Commit message                                                                                                                                                                            | Release type                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| fix(pencil): stop graphite breaking when too much pressure applied                                                                                                                        | Fix Release - 0.0.1                                                                                 |
| feat(pencil): add 'graphiteWidth'option                                                                                                                                                   | Feature Release - 0.1.0                                                                             |
| perf(pencil): remove graphiteWidth option <br> BREAKING CHANGE: The graphiteWidth option has been removed.The default graphite <br> width of 10mm is always used for performance reasons. | Breaking Release (Note that the BREAKING CHANGE: token must be in the footer of the commit) - 1.0.0 |

## Deploy to ECS Instance (Dev & Prod)

### GitHub Actions

1. Build-Pipeline: Pull Request oder direkter Main-Commit triggert Image Erstellung, Trivy Image Scan, Release Erstellung mit neuer App Version & Image Push mit Tag neuer App Version <br>
   - Welche App Version erzeugt wird hängt vom Commit Message Inhalt ab -> Conventional Commits Standards<br>
   - Ein Merge oder Push ohne Conventional Commit baut und scannt das Image, pusht es aber nicht in die ECR, weil kein Release erstellt wird<br>
   - Semantic-Release generiert Release Notes, aktualisiert den Changelog und Versionsdateien<br>
2. Infra-Pipeline: Startet automatisch nach der Build-Pipeline und zieht IMMER das zuletzt erstellte Release aus GitHub<br>
   - Ohne neues Release wird daher kein Software-Artefakt in die ECS Instanzen deployt<br>
   - Prod-Release wird über Approval im GitHub Issue gesteuert ([Manual Workflow Approval](https://github.com/marketplace/actions/manual-workflow-approval))<br>

_Achtung:_

1. Wenn keine commit message den "Conventional Commits Standard" entspricht, wird semantic release keine Release erstellen und damit auch keine neue App-Version
2. Wenn die vorletzte commit message den "Conventional Commits Standard" entspricht, aber die letzte nicht, wird auch nur der Stand des vorletzten commits für das Release genommen

**DAHER: Immer mindestens der Merge-Commit muss den Conventional Commits Standards entsprechen, ansonsten wird keine neue App-Version und kein GitHub Release erstellt!**

## Deploy to ECS Instance (Dev & Prod)

### AWS Infra

- Nutzung von AWS CDK als IaC-Tool:
  - **PreInfra Construct**: OIDC Config, Build Rolle (AmazonEC2ContainerRegistryFullAccess), Infra Rolle(AdministratorAccess)
  - **Infra-Construct**: Repo, Application Load Balancer, VPC & Secrets im Secret Manager, Customer Managed Key
  - **ECS-Construct**: ECS-Cluster, Service, Tasks, Secret-Mapping, Listener-Rule Eintrag in Loadbalancer, Route 53 A Record, Cloud-Watch Logs
  - Customer Managed Keys für Container Logs und Secrets

![Healthcare aws infrastruktur](healthcare.drawio.png)

## Brief-Struktur

### Früherkennung

- Zusammenfassung:
  Diagnose: (ICD-10: XX)
  Therapie / Operation: (OPS Code: XX)
  Schnitt-Naht-Zeit: (geplant, Minuten)
  Operateur / Betreuender Arzt:
  Kostenzusage: Bitte löschen, wenn nicht relevant
- Anamnese
- Untersuchung und Diagnostik
- Beratungsinhalte

### Stationärer Arztbrief

- Zusammenfassung
- Anamnese
- Perioperative Verlaufsdokumentation
- Postoperativ nach stationär

### Abklärung / Zweitmeinung

- Zusammenfassung
- Anamnese
- Untersuchung und Diagnostik
- Stereotaktische Vakuumbiopsie
- Prätherapeutische Konferenz
- Beratungsinhalte
- Weiteres Vorgehen
