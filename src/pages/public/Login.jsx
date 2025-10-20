import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
      navigate("/dashboard");          // nach Login zum User-Bereich
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="max-w-sm mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Login</h1>
      {error && <div className="text-red-600 text-sm">{error}</div>}

      <input
        className="w-full border p-2 rounded"
        type="email"
        placeholder="E-Mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
      />
      <input
        className="w-full border p-2 rounded"
        type="password"
        placeholder="Passwort"
        value={pass}
        onChange={(e) => setPass(e.target.value)}
        autoComplete="current-password"
        required
      />

      <button
        className="w-full bg-gray-900 text-white py-2 rounded disabled:opacity-60"
        disabled={loading}
      >
        {loading ? "Einloggen…" : "Einloggen"}
      </button>
    </form>
  );
}
