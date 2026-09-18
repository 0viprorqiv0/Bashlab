export const metadata = {
  title: '403: Access Denied',
};

const styles = `
  .error-container {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    width: 100vw;
    padding: 24px;
    background-color: #000000;
    color: #E8E9F0;
    overflow: hidden;
  }
  .error-content {
    display: inline-flex;
    align-items: center;
    text-align: left;
  }
  .error-code {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 24px;
    font-weight: 500;
    line-height: 48px;
    padding-right: 24px;
    color: #E8E9F0;
    letter-spacing: -0.02em;
  }
  .error-divider {
    width: 1px;
    height: 48px;
    background-color: rgba(255, 255, 255, 0.25);
  }
  .error-message {
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 400;
    line-height: 48px;
    padding-left: 24px;
    color: #E8E9F0;
    letter-spacing: 0;
    white-space: nowrap;
  }
  @media (max-width: 640px) {
    .error-code {
      font-size: 22px;
      padding-right: 18px;
    }
    .error-message {
      font-size: 14px;
      padding-left: 18px;
      white-space: normal;
      line-height: 1.4;
    }
    .error-divider {
      height: 40px;
    }
  }
`;

export default function Forbidden() {
  return (
    <>
      <style>{styles}</style>
      <div className="error-container">
        <div className="error-content">
          <h1 className="error-code">403</h1>
          <div className="error-divider" aria-hidden="true" />
          <p className="error-message">You do not have permission to access this page.</p>
        </div>
      </div>
    </>
  );
}
