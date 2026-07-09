const fs = require('fs');

const appTsx = fs.readFileSync('src/App.tsx', 'utf-8');

const proModalStart = appTsx.indexOf('{/* 👑 Muse AI 訂閱與付費計畫 Modal */}');
const proModalEnd = appTsx.indexOf('      {/* 📜 隱私權政策與服務條款 Modal */}');

const legalModalStart = proModalEnd;
const legalModalEnd = appTsx.indexOf('      {/* Global Canvas Crop Modal */}');

let proModalStr = appTsx.substring(proModalStart, proModalEnd);
let legalModalStr = appTsx.substring(legalModalStart, legalModalEnd);

// Strip the wrapper condition `{showProModal && (` and `)}`
proModalStr = proModalStr.replace(/\{showProModal && \(\s*/, '').replace(/\s*\)\}\s*$/, '');
legalModalStr = legalModalStr.replace(/\{showLegalModal && \(\s*/, '').replace(/\s*\)\}\s*$/, '');

const proModalComponent = `
export function ProModal({
  userTier, setUserTier, credits, setCredits, billingPeriod, setBillingPeriod, setShowProModal
}: any) {
  return (
${proModalStr}
  );
}
`;

const legalModalComponent = `
export function LegalModal({
  showLegalModal, setShowLegalModal
}: any) {
  return (
${legalModalStr}
  );
}
`;

fs.appendFileSync('src/components/Modals.tsx', proModalComponent + legalModalComponent);

// Replace in App.tsx
let newAppTsx = appTsx;
newAppTsx = newAppTsx.replace(
  appTsx.substring(proModalStart, legalModalEnd),
  `{/* 👑 Muse AI 訂閱與付費計畫 Modal */}
      {showProModal && (
        <ProModal 
          userTier={userTier} setUserTier={setUserTier}
          credits={credits} setCredits={setCredits}
          billingPeriod={billingPeriod} setBillingPeriod={setBillingPeriod}
          setShowProModal={setShowProModal}
        />
      )}

      {/* 📜 隱私權政策與服務條款 Modal */}
      {showLegalModal && (
        <LegalModal 
          showLegalModal={showLegalModal} 
          setShowLegalModal={setShowLegalModal} 
        />
      )}
`
);

// Update import in App.tsx
newAppTsx = newAppTsx.replace(
  'import { NewProjModal, AddFileModal, AddFolderModal, NewThreadModal } from "./components/Modals";',
  'import { NewProjModal, AddFileModal, AddFolderModal, NewThreadModal, ProModal, LegalModal } from "./components/Modals";'
);

fs.writeFileSync('src/App.tsx', newAppTsx);
console.log('Modals extracted successfully.');
